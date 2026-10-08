# Grille de notation « conformité / propreté » (juge)

Le juge lit `geo-nav.mjs` **et** `geo-nav.test.mjs` du run, sans connaître le
profil qui les a produits, et note **5 critères sur 0-2** (total /10). Il ne
réexécute pas les tests (la correction est mesurée séparément par l'oracle
caché) — il juge la **forme**.

| # | Critère | 0 | 1 | 2 |
|---|---|---|---|---|
| C1 | **Gestion des cas limites & erreurs** (vitesse 0 → Infinity, validations `TypeError`/`RangeError`, wraparound du cap) | absente/incorrecte | partielle | complète et fidèle à la spec |
| C2 | **Pureté ESM & conventions** (exports nommés, imports `.mjs`, zéro dépendance, pas de CommonJS) | violations | écarts mineurs | impeccable |
| C3 | **Lisibilité & nommage** (noms clairs, code direct, commentaires utiles sans bruit) | confus | correct | net |
| C4 | **Simplicité / pas de sur-ingénierie** (aucune abstraction spéculative, aucun code mort, surface minimale) | sur-ingénierie nette | quelques excès | minimal et juste |
| C5 | **Qualité des tests** (`node:test` idiomatique : nominaux + limites + erreurs, assertions signifiantes) | quasi absents | partiels | couverture sérieuse |

Le juge retourne, par run : le score de chaque critère (0-2), le **total /10**, et
une justification d'**une ligne par critère**.

**Constance** : le juge tourne sous le **même modèle** pour les 9 runs (il hérite
du modèle de la session unique qui lance le Workflow) — il ne fait donc pas
partie des variables comparées, c'est un instrument fixe.
