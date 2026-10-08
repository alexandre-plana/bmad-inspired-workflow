import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
  assert.deepEqual(lock.files.map((entry) => entry.path).sort(), [
    'LICENSE', 'skills/ponytail-review/SKILL.md', 'skills/ponytail/SKILL.md',
  ]);
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
