# Provenance de l'extraction

- Origine : workflow local extrait d'un projet applicatif.
- Commit source : `d4dbafc86606a976eec3e195b244c91b101cc365`.
- Date d'extraction : 8 octobre 2026.
- Destination : `alexandre-plana/bmad-inspired-workflow`.
- Inventaire : `extraction-manifest.json`, chemin et SHA-256 pour chacun des 85 fichiers copiés.

## Périmètre

Les sources copiées comprennent cinq skills (quatre du cœur et le compagnon `screen-composition`), leurs templates et évaluations, les agents et variantes, le CLI de suivi avec ses tests et exemples, ainsi que les benchmarks de profils d'exécution.

Les fichiers ont d'abord été copiés, puis adaptés pour retirer le nom du projet d'origine. Les agents, le routage et les templates actifs ont ensuite été rendus génériques : stack, chemins, règles métier et contrôles proviennent du projet cible. Le manifeste conserve les empreintes d'origine dans `sourceSha256` et celles des fichiers actuels dans `sha256`. Les fichiers ajoutés sont inventoriés séparément sous `addedFiles`.

Les évaluations et benchmarks historiques conservent leurs scénarios d'origine à titre d'exemples. Ils n'imposent aucune architecture aux agents actuels.

Le code applicatif, les paramètres de lancement, les configurations MCP locales, les secrets, les index d'historique réels, les conversations, les journaux d'exécution privés, les skills métier de l'application et les documents opérationnels sont exclus.

## BMAD

Le nom du dépôt décrit l'inspiration de la méthode locale. Cette extraction n'installe pas BMAD, CIS ou TEA et ne copie pas une distribution de leurs sources. Les mécanismes évoqués dans les plans d'évolution du projet ne sont pas tous réalisés dans le workflow extrait.

## Licence

Les principes communs d'implémentation et la revue du verifier sont adaptés de Ponytail `v5.0.0`, commit `b088b2df6e08d4306c6a3c3d575fe38c2d2d2989`. [NOTICE](../NOTICE.md) précise les références et adaptations ; [la notice MIT originale](../third_party/ponytail/LICENSE) accompagne ces éléments. Aucun hook de session ou mode global de Ponytail n'est installé.

Le projet source ne fournit pas de fichier de licence applicable à l'ensemble de l'extraction. Aucune licence générale de redistribution n'est ajoutée aux autres fichiers. Les références à des projets tiers ou à leurs licences dans les documents historiques ne déterminent pas la licence de tout le dépôt.
