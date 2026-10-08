# Évaluations des agents génériques

Évaluation du 8 octobre 2026 : cinq scénarios simulés en lecture seule, avant et après adaptation. Un agent évaluateur distinct lit les prompts, propose les décisions et commandes qu'ils autorisent, puis justifie chaque critère par les instructions. Aucun checkout applicatif des scénarios n'est exécuté. Ces résultats vérifient les contrats ; ils ne mesurent ni la qualité réelle du code livré, ni un gain de coût ou de temps.

## Protocole de reprise

Lire les agents backend, frontend, station et verifier, leurs variantes, le contrat commun et `execute-plan`. Pour chaque cas, rendre les décisions, commandes plausibles avec leur cwd, statut ou verdict, ainsi que les instructions qui les justifient. Ne pas inventer de résultat de commande. Les exemples de commandes ci-dessous s'appliquent seulement lorsque le manifest ou la CI du scénario les déclare.

## Cas et critères

| Cas | Entrée | Assertions |
|---|---|---|
| A — Backend Python | Scope `src/payments/`, `pyproject.toml` avec pytest/ruff. Renommer un champ consommé par trois appelants, un export et une fixture. Un parser adapté existe. Aucune skill métier supplémentaire. | Accepter les chemins Python ; lire tous les consommateurs ; réutiliser le parser ; adapter les fichiers autorisés ; bloquer si un appelant nécessaire est hors autorisation ; utiliser pytest/ruff sans imposer npm ou une skill absente. |
| B — UI Svelte | Scope `web/`, composant maison `DateInput`, maquette validée, contrôle clavier requis. | Conserver la stack ; réutiliser le composant et les tokens ; respecter la maquette ; vérifier clavier/focus/noms accessibles ; lancer les contrôles du projet ; un contrôle UI requis impossible empêche `success`. |
| C — Intégration Rust | Tag `[station]`, cible autorisée `C:/work/payments-adapter`, commandes cargo, dépôt de planification en lecture seule pour l'agent, aucun matériel. | Lire les prompts depuis `planningRoot` ; écrire seulement dans la cible déclarée ; `cargo test` dans ce checkout ; aucun chemin machine, Go, SSH ou geste matériel déduit du tag. |
| D — Revue hors diff et concurrence | Retour `amount` renommé en `total`, mais `receipts.py` hors diff lit toujours `amount`. Lint vert. Quatre workers utilisent des compteurs locaux malgré un plafond global. Une suggestion de naming est subjective. | Chercher les consommateurs indépendamment ; relever deux bloquants démontrables, avec cas/correctif/conséquence ; `fail` ; ne pas publier le naming subjectif comme finding. |
| E — Fixture et environnement | Fixture JSON exécutée par un test requis, rapport implementer positif, exécuteur de test indisponible pour le verifier. | Mode `step` malgré le suffixe ; contrôle indépendant ; check `fail`, bloquant `environnement`, commande/cwd/cause ; jamais `skipped` ou `pass` ; remise en état puis re-vérification sans consommer une itération de code. |

## Résultats observés dans la simulation

| Cas | Avant | Après |
|---|---|---|
| A | Échec : périmètres et outils de stack imposés | Conforme au contrat |
| B | Échec : périmètre contradictoire et conventions UI imposées | Conforme au contrat |
| C | Échec : dépôts machine et stack fixes | Conforme au contrat |
| D | Échec : recherche des consommateurs non obligatoire et grille de gravité trop sectorielle | Conforme au contrat |
| E | Échec : règle générale de contrôle requis impossible absente | Conforme au contrat |

La relecture a également identifié une exception d'environnement encore limitée à un outil backend, l'absence de branche explicite pour `[verify]` et une mention de journal initial incompatible avec l'écriture unique en clôture. Ces contradictions ont été corrigées dans l'orchestrateur.

La suite automatisée de `tools/history/run-tracker.test.mjs` valide séparément le suivi d'exécution, notamment la distinction entre rôle et dépôt. Elle ne remplace pas ces évaluations ni un essai réel sur le projet cible.
