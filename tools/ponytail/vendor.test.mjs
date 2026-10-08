import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const vendorRoot = resolve(root, 'third_party/ponytail');
const loadLock = () => JSON.parse(readFileSync(resolve(vendorRoot, 'upstream-lock.json'), 'utf8'));

test('les sources Ponytail sont épinglées à la version officielle attendue', () => {
  const lock = loadLock();
  assert.equal(lock.repository, 'https://github.com/DietrichGebert/ponytail');
  assert.equal(lock.version, 'v5.0.0');
  assert.equal(lock.commit, 'b088b2df6e08d4306c6a3c3d575fe38c2d2d2989');
  assert.equal(lock.scope, 'complete-source-tree');
  assert.equal(lock.tree, 'cd94f9b4abb6ff6e65055b0076e82a5b13c693aa');
  assert.equal(lock.files.length, 199);
  assert.equal(new Set(lock.files.map((entry) => entry.path)).size, 199);
});

// L'arbre officiel fixe aussi la liste complète des chemins et leurs modes :
// retirer un fichier du disque ET du lock ne doit pas masquer un import incomplet.
test('le lock reconstruit l’arbre Git officiel complet, sans source omise ou ajoutée', () => {
  const lock = loadLock();
  const tree = new Map();
  for (const entry of lock.files) {
    const parts = entry.path.split('/');
    let folder = tree;
    for (const part of parts.slice(0, -1)) {
      if (!folder.has(part)) folder.set(part, new Map());
      folder = folder.get(part);
    }
    folder.set(parts.at(-1), entry);
  }
  const hashTree = (folder) => {
    const entries = [...folder].sort(([a, av], [b, bv]) =>
      Buffer.compare(Buffer.from(a + (av instanceof Map ? '/' : '')),
        Buffer.from(b + (bv instanceof Map ? '/' : ''))));
    const bytes = Buffer.concat(entries.map(([name, value]) => Buffer.concat([
      Buffer.from(`${value instanceof Map ? '40000' : value.mode} ${name}\0`),
      Buffer.from(value instanceof Map ? hashTree(value) : value.gitBlob, 'hex'),
    ])));
    return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');
  };
  assert.equal(hashTree(tree), 'cd94f9b4abb6ff6e65055b0076e82a5b13c693aa');
  const actual = readdirSync(vendorRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name).slice(vendorRoot.length + 1).replaceAll('\\', '/'))
    .filter((path) => path !== 'upstream-lock.json').sort();
  assert.deepEqual(actual, lock.files.map((entry) => entry.path).sort());
});

test('chaque fichier importé conserve exactement les octets et le blob Git upstream', () => {
  const lock = loadLock();
  for (const entry of lock.files) {
    const bytes = readFileSync(resolve(vendorRoot, entry.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.path);
    const blob = createHash('sha1')
      .update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(blob, entry.gitBlob, entry.path);
  }
});
