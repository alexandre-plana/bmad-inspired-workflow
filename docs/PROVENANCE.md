# Provenance de l'extraction

- Origine : workflow local extrait d'un projet applicatif.
- Commit source : `d4dbafc86606a976eec3e195b244c91b101cc365`.
- Date d'extraction : 8 octobre 2026.
- Destination : `alexandre-plana/bmad-inspired-workflow`.
- Inventaire : `extraction-manifest.json`, chemin et SHA-256 pour chacun des 85 fichiers copiés.

## Périmètre

Les sources copiées comprennent cinq skills (quatre du cœur et le compagnon `screen-composition`), leurs templates et évaluations, les agents et variantes, le CLI de suivi avec ses tests et exemples, ainsi que les benchmarks de profils d'exécution.

Les fichiers ont d'abord été copiés, puis adaptés pour retirer le nom du projet d'origine. Le manifeste conserve les empreintes d'origine dans `sourceSha256` et les empreintes des fichiers actuels dans `sha256`. Les documents d'accueil et de portage, les conventions d'historique vides et les fichiers de configuration Git de ce dépôt sont ajoutés pour présenter l'extraction.

Le code applicatif, les paramètres de lancement, les configurations MCP locales, les secrets, les index d'historique réels, les conversations, les journaux d'exécution privés, les skills métier de l'application et les documents opérationnels sont exclus.

## BMAD

Le nom du dépôt décrit l'inspiration de la méthode locale. Cette extraction n'installe pas BMAD, CIS ou TEA et ne copie pas une distribution de leurs sources. Les mécanismes évoqués dans les plans d'évolution du projet ne sont pas tous réalisés dans le workflow extrait.

## Licence

Le projet source ne fournit pas de fichier de licence applicable à cette extraction. Aucune licence de redistribution, notamment MIT, n'est ajoutée par cette opération. Les références à des projets tiers ou à leurs licences dans les documents historiques ne déterminent pas la licence des fichiers locaux.
