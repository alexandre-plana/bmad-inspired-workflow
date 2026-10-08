# Réutilisation directe de Ponytail 5.0

Les règles de travail proviennent des fichiers officiels de Ponytail, conservés sans traduction ni modification. Nos agents ajoutent une interface avec le plan, les permissions et le suivi ; ils ne maintiennent plus une copie reformulée de la méthode.

## Sources et intégrité

- Dépôt : [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/v5.0.0).
- Version : `v5.0.0`, commit `b088b2df6e08d4306c6a3c3d575fe38c2d2d2989`.
- Copies officielles : [ponytail](../third_party/ponytail/skills/ponytail/SKILL.md), [ponytail-review](../third_party/ponytail/skills/ponytail-review/SKILL.md) et [LICENSE](../third_party/ponytail/LICENSE).
- [upstream-lock.json](../third_party/ponytail/upstream-lock.json) enregistre les SHA-256 et les identifiants des blobs Git officiels. Ils ont été comparés à l'arbre Git du commit upstream lors de l'import.
- `.gitattributes` désactive la conversion des fins de ligne dans `third_party/ponytail/`. Les fichiers sont identiques octet pour octet, y compris leur frontmatter.

Vérification locale sans réseau ni dépendance à installer :

```powershell
node --test tools/ponytail/vendor.test.mjs
```

Modifier un fichier officiel fait échouer le contrôle d'intégrité. Une mise à jour doit choisir explicitement une nouvelle version, importer les fichiers correspondants, vérifier leurs blobs upstream, puis revoir les adaptateurs et leurs évaluations. Ne pas simplement recalculer le lock après une édition locale.

## Chaîne de chargement

| Rôle | Chargement obligatoire |
|---|---|
| Backend, frontend, station et leurs variantes | Agent de base → `references/implementation.md` → `third_party/ponytail/skills/ponytail/SKILL.md` |
| Verifier et ses variantes | Agent de base → `third_party/ponytail/skills/ponytail-review/SKILL.md` |

Chaque chemin est résolu depuis `planningRoot`, fourni par l'orchestrateur. Le checkout d'exécution peut être ailleurs. Une source absente bloque l'exécution ; aucun résumé local ne la remplace.

## Adaptations limitées à l'interface

| Interface | Règle locale ajoutée |
|---|---|
| Autorisations | Le changement complet demandé par Ponytail reste limité aux chemins autorisés ; une extension nécessaire est remontée à l'orchestrateur |
| Invocation | Le comportement `full` de Ponytail est utilisé par défaut dans le contexte de l'agent ; le chargement ne modifie pas la configuration ou les autres conversations |
| Langue et sortie implementer | Rapport structuré dans la langue du projet, avec les contrôles, limites et les lignes finales sur le non-vérifié et le risque |
| Sortie verifier | Revue source complète, explications traduites si nécessaire, catégories et numéros conservés ; traduction séparée vers les champs du tracker |
| Contrôles | Exécution indépendante des commandes requises ; modes `docs-config`, `step` et `final` ; contrôle requis impossible bloquant |
| Cycle de vie | Trois itérations maximum, suivi écrit par l'orchestrateur, journal final par le documentaliste |

Le commentaire `ponytail:` pour un raccourci à limite connue reste exigé par la source ; le rapport ne le remplace plus. Les tests et l'ordre des choix d'implémentation suivent le fichier officiel, sans exemption locale supplémentaire.

Pour la revue, produire d'abord `Must fix`, `Should fix` et `Nice to have` selon la source. Les `Must fix` et les constats dont le verdict source exige la correction deviennent bloquants. Les autres recommandations peuvent rester des notes si le verdict source et les critères du projet permettent leur report. Les défauts des contrôles requis sont ajoutés séparément ; ils ne sont pas présentés comme des constats upstream.

## Périmètre importé

Seuls les deux skills demandés et leur licence sont importés. Les hooks, commandes d'activation de session, autres skills et fichiers du plugin complet ne sont pas installés. La méthode est réutilisée par lecture des copies officielles ; cela n'annonce pas une installation complète du plugin Ponytail.

Licence et attribution : [NOTICE](../NOTICE.md). Les tests d'intégrité prouvent la fidélité des fichiers, pas l'obéissance parfaite d'un modèle ; les évaluations de comportement restent séparées.
