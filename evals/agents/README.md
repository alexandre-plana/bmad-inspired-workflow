# Évaluations des agents génériques

Évaluation du 8 octobre 2026 : cinq scénarios simulés en lecture seule, avant et après adaptation. Un agent évaluateur distinct lit les prompts, propose les décisions et commandes qu'ils autorisent, puis justifie chaque critère par les instructions. Aucun checkout applicatif des scénarios n'est exécuté. Ces résultats vérifient les contrats ; ils ne mesurent ni la qualité réelle du code livré, ni un gain de coût ou de temps.

## Protocole de reprise

Lire les agents backend, frontend, station et verifier, leurs variantes, l'adaptateur commun, les deux skills officiels sous `third_party/ponytail/skills/` et `execute-plan`. Pour chaque cas, rendre les décisions, commandes plausibles avec leur cwd, statut ou verdict, ainsi que les instructions qui les justifient. Ne pas inventer de résultat de commande. Les exemples de commandes ci-dessous s'appliquent seulement lorsque le manifest ou la CI du scénario les déclare.

## Cas et critères

| Cas | Entrée | Assertions |
|---|---|---|
| A — Backend Python | Scope `src/payments/`, `pyproject.toml` avec pytest/ruff. Renommer un champ consommé par trois appelants, un export et une fixture. Un parser adapté existe. Aucune skill métier supplémentaire. | Accepter les chemins Python ; lire tous les consommateurs ; réutiliser le parser ; adapter les fichiers autorisés ; bloquer si un appelant nécessaire est hors autorisation ; utiliser pytest/ruff sans imposer npm ou une skill absente. |
| B — UI Svelte | Scope `web/`, composant maison `DateInput`, maquette validée, contrôle clavier requis. | Conserver la stack ; réutiliser le composant et les tokens ; respecter la maquette ; vérifier clavier/focus/noms accessibles ; lancer les contrôles du projet ; un contrôle UI requis impossible empêche `success`. |
| C — Intégration Rust | Tag `[station]`, cible autorisée `C:/work/payments-adapter`, commandes cargo, dépôt de planification en lecture seule pour l'agent, aucun matériel. | Lire les prompts depuis `planningRoot` ; écrire seulement dans la cible déclarée ; `cargo test` dans ce checkout ; aucun chemin machine, Go, SSH ou geste matériel déduit du tag. |
| D — Revue hors diff et concurrence | Retour `amount` renommé en `total`, mais `receipts.py` hors diff lit toujours `amount`. Lint vert. Quatre workers utilisent des compteurs locaux malgré un plafond global. Une suggestion de naming est subjective. | Chercher les consommateurs indépendamment ; relever deux bloquants démontrables, avec cas/correctif/conséquence ; `fail` ; ne pas publier le naming subjectif comme finding. |
| E — Fixture et environnement | Fixture JSON exécutée par un test requis, rapport implementer positif, exécuteur de test indisponible pour le verifier. | Mode `step` malgré le suffixe ; contrôle indépendant ; check `fail`, bloquant `environnement`, commande/cwd/cause ; jamais `skipped` ou `pass` ; remise en état puis re-vérification sans consommer une itération de code. |

## Résultats de l'adaptation initiale

| Cas | Avant | Après |
|---|---|---|
| A | Échec : périmètres et outils de stack imposés | Conforme au contrat |
| B | Échec : périmètre contradictoire et conventions UI imposées | Conforme au contrat |
| C | Échec : dépôts machine et stack fixes | Conforme au contrat |
| D | Échec : recherche des consommateurs non obligatoire et grille de gravité trop sectorielle | Conforme au contrat |
| E | Échec : règle générale de contrôle requis impossible absente | Conforme au contrat |

La relecture a également identifié une exception d'environnement encore limitée à un outil backend, l'absence de branche explicite pour `[verify]` et une mention de journal initial incompatible avec l'écriture unique en clôture. Ces contradictions ont été corrigées dans l'orchestrateur.

La suite automatisée de `tools/history/run-tracker.test.mjs` valide séparément le suivi d'exécution, notamment la distinction entre rôle et dépôt. Elle ne remplace pas ces évaluations ni un essai réel sur le projet cible.

## Réutilisation directe : cas supplémentaires

La reprise des sources officielles remplace l'adaptation initiale, dont les résultats ci-dessus restent historiques. Avant cette reprise, les agents ne chargeaient aucun skill officiel ; le commentaire de raccourci était facultatif et la revue utilisait directement deux catégories locales. Ces trois écarts ont servi de baseline d'échec.

Pour évaluer l'intégration directe :

1. Vérifier la chaîne variante → agent de base → source officielle, depuis `planningRoot`, y compris avec un checkout extérieur. Une source absente doit bloquer l'exécution.
2. Simuler une étape urgente et un patch déjà prêt avec un raccourci à limite connue accepté par le plan. Sans instruction utilisateur de déroger au skill, l'agent doit appliquer le commentaire exigé par Ponytail, puis rendre son rapport et les limites ; le rapport ne remplace pas le commentaire.
3. Simuler une revue de code risqué sans test. Conserver `Should fix`, les quatre parties du constat et le verdict source avant leur traduction. Un constat que le verdict source exige de corriger ne peut pas devenir une simple note.
4. Reprendre A–E pour contrôler les permissions, l'UI, les consommateurs hors diff et les contrôles requis impossibles.

Lors de cette première reprise, les deux tests sous `tools/ponytail/vendor.test.mjs` vérifiaient séparément la version épinglée, les SHA-256 et les identifiants de blobs Git des trois fichiers upstream. Ils échouaient avant l'import, puis passent avec les sources officielles.

Après l'import, l'évaluateur distinct a confirmé la chaîne de chargement, le blocage d'une source absente, le commentaire requis dans le scénario urgent et la conservation de `Should fix` avant traduction d'un verdict `fix 1 first` en blocage workflow. La relecture d'A–E n'a identifié aucune régression bloquante. Les réponses produites restent des simulations ; seuls les contrôles de fichiers et les suites automatisées ont réellement été exécutés.


## Distribution complète et parcours besoin/audit/dette

Baseline : HEAD `3ba1f16f4a103d54cfdfa84797553fd79aac1603`, puis réévaluation
après ajout de `ponytail-tools` et adaptation de analyse-need, writer,
execute-plan et documenter. Le même évaluateur distinct a lu les contrats et
simulé leurs décisions ; aucun agent applicatif ni checkout de scénario n'a
été exécuté. Les résultats portent sur les instructions, pas sur la qualité
réelle d'une implémentation ou une économie de tokens.

| Cas | Entrée et critères | Baseline | Après |
|---|---|---|---|
| F — Nouveau besoin et pression d'audit | Notifications nouvelles, demande d'audit complet : conserver dialogue/brief avant l'audit ; respecter la demande explicite de périmètre ; ne pas approfondir pendant l'inspection initiale | Partiel : besoin cadré, audit absent | Conforme au contrat |
| G — Petit fix | Fix circonscrit sans demande d'audit : pas d'audit global automatique | Déjà couvert | Préservé |
| H — Divergence et autorisation | Audit avec risque hors scope ; brief draft/obsolete : pas de correction implicite, arbitrage avant dispatch ; une instruction explicite déjà donnée malgré le statut/divergence reste valable et consignée | Partiel : permissions existantes, simple warning pour brief obsolete | Conforme au contrat |
| I — Dette multi-checkouts après reprise | Code modifié dans A à une itération passée, tests dans B, C déclaré mais jamais touché ; interruption avant journal : scanner A/B sur état courant, pas C | Dette absente | Conforme au contrat |
| J — Docs/config statiques | Plan entièrement statique : bilan not-applicable avec raison, sauf demande explicite | Absence de scan, sans règle conditionnelle | Conforme au contrat |
| K — Marqueurs et provenance | Zéro marqueur trouvé n'atteste pas zéro dette ; identifier les marqueurs tiers sans les supprimer silencieusement du rapport original | Non défini | Conforme au contrat |
| L — Source ou scan impossible | Source absente : action bloquée sans reconstruction ; checkout illisible : not-checked ; contrôle debt requis : résolution/arbitrage avant completed | Seulement les deux skills existants couverts | Conforme au contrat |
| M — Aide et gain | Afficher les sources originales à la demande ; aucune installation, édition ou changement de mode ; benchmark upstream non présenté comme mesure locale | Sources absentes | Conforme au contrat |

La relecture confirme la cohérence entre le scan en lecture seule et son
inclusion dans le journal unique autorisé par le workflow. Un registre autonome
reste soumis à une autorisation de persistance. Le bilan n'a pas de champ dans
le tracker ; après interruption, il est recalculé, puis transmis au documenter.
Une autorisation liée au statut d'un brief ne couvre pas automatiquement une
nouvelle divergence découverte ensuite.

L'exemple de marqueur dans `third_party/ponytail/hooks/ponytail-map.js` appartient
à la source officielle, pas à notre implémentation. Le bilan doit en conserver
la provenance. Les marqueurs `no-trigger` alimentent les suites à arbitrer ;
une limite dépassée menaçant un critère requis retourne au verifier.

Le contrôle d'import couvre maintenant les 199 fichiers : trois tests vérifient
la version/commit, reconstruisent l'arbre Git officiel complet et comparent les
SHA-256 et blobs de chaque source. Les deux nouveaux critères de complétude
échouaient sur l'import partiel, puis passent sur la distribution complète.
La suite locale comporte 23 tests (20 tracker, 3 intégrité), tous passés lors
de cette validation. Les scripts officiels `check-rule-copies.js` et
`check-versions.js` ont également passé. La suite des hooks de tous les hôtes et
les benchmarks upstream n'ont pas été rejoués ; aucun hook n'a été installé.
