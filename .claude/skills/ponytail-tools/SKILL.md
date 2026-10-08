---
name: ponytail-tools
description: >-
  À utiliser pour une demande d'audit de code, d'inventaire des compromis
  ponytail, d'aide ou de benchmarks Ponytail, ou lors de leur appel par le
  workflow. Un nouveau besoin fonctionnel commence par analyse-need.
---

# Outils Ponytail — adaptateur du workflow

## Charger la source originale

Résoudre `planningRoot` (racine portant ces instructions) et le checkout
cible explicitement. Lire intégralement le fichier correspondant avant d'agir :

| Demande | Source depuis planningRoot |
|---|---|
| Audit de code | `third_party/ponytail/skills/ponytail-audit/SKILL.md` |
| Inventaire des compromis | `third_party/ponytail/skills/ponytail-debt/SKILL.md` |
| Aide | `third_party/ponytail/skills/ponytail-help/SKILL.md` |
| Benchmarks publiés | `third_party/ponytail/skills/ponytail-gain/SKILL.md` |

Appliquer la méthode et produire le rapport original complet. Le présent
adaptateur ne le remplace pas. Source absente ou illisible : action `blocked`,
chemin exact et cause ; aucune méthode reconstituée de mémoire. Les implementers
et le verifier conservent leurs chargements de `ponytail` et `ponytail-review`.
Ne charger que la source utile, pas les six skills à chaque étape.

## Audit avant planification

Pour un nouveau besoin, conserver d'abord le dialogue et le brief de
`analyse-need`. Son inspection reste superficielle. Un audit approfondi est
une action distincte, après ce cadrage et avant le plan, si :

- l'utilisateur demande l'audit ;
- une limite du code existant peut compromettre un critère du brief ;
- une reprise ou refonte concerne une zone dont le comportement est incertain.

Sinon, passer au writer directement ; une petite évolution ou un petit fix
ne déclenche pas un audit global. Une demande autonome d'audit passe directement
à la source officielle, sans fabriquer un brief fonctionnel.

Transmettre à l'audit le checkout et le périmètre concernés, le brief s'il
existe, la charge attendue et les critères disponibles. Un dossier ou package
nommé limite l'audit selon la source ; nommer ce périmètre pour un audit appelé
par le workflow. Une demande explicite d'auditer tout le repo est respectée.
La charge inconnue reste une hypothèse déclarée, pas un fait inventé.

Après le rapport, le writer distingue les constats utiles au besoin, les
recommandations hors périmètre et les limites de lecture. Le brief reste
l'autorité sur le besoin. Si un constat invalide un objectif, une contrainte
critique ou le périmètre, revenir au dialogue `analyse-need` et faire arbitrer
avant de figer le plan exécutable. Un constat, même `Must fix`, n'autorise pas
une correction hors périmètre ; signaler sa conséquence et obtenir l'arbitrage.

## Dette à la clôture

L'orchestrateur appelle `ponytail-debt` après la vérification finale, avant
l'écriture unique du journal, pour chaque checkout où l'exécution a modifié du
code, des tests ou une configuration exécutable. Reconstituer cette liste
avec les rapports de toutes les itérations, y compris après reprise. Les tags
seuls ne prouvent pas quels fichiers ont été modifiés. Des docs et paramètres
strictement statiques seuls rendent le bilan `not-applicable`, avec la raison.
Une demande explicite de dette reste possible sur tout checkout désigné.

Scanner chaque checkout concerné selon la source officielle. Identifier les
marqueurs provenant de sources tierces comme tels ; garder leur provenance,
ils ne sont pas des compromis introduits par notre implémentation. Rendre un
rapport distinct par checkout, avec racine, périmètre, résultat original et
limites de lecture. Ne pas scanner les autres dépôts simplement déclarés dans
le plan. Un checkout illisible donne `not-checked` avec sa cause, jamais un
inventaire vide prétendument réussi.

Le bilan inventorie les marqueurs ; zéro marqueur signifie zéro compromis
marqué trouvé, pas zéro dette technique ni une preuve de qualité générale.
Un marqueur `no-trigger` devient un point à arbitrer, pas une correction
automatique. Une limite dépassée qui menace un critère requis est renvoyée au
verifier ; l'inventaire ne neutralise pas les échecs de vérification.

Rapport en lecture seule par défaut. L'intégration dans le journal est autorisée
par l'exécution du workflow ; un fichier de dette autonome ou son actualisation
exige une demande ou une autorisation déjà fournie. Le documentaliste reçoit
le bilan exact et sa couverture ; il ne refait pas le scan. Aucun nouveau champ
ni rôle `audit`/`debt` n'est ajouté au tracker. Après interruption, refaire le
bilan sur l'état courant avant la clôture, sans réutiliser un résultat périmé.

## Aide, benchmarks et hooks

`help` et `gain` sont disponibles à la demande, sans modification de code,
de configuration ni de mode de session. Les chiffres de `gain` sont les
benchmarks publiés upstream, jamais des gains mesurés sur le projet cible.

Tous les fichiers du plugin sont embarqués, mais les hooks ne s'activent pas
par simple lecture de ce skill. Leur installation est une action explicite
distincte. Voir [le contrat d'intégration](../../../docs/PONYTAIL_INTEGRATION.md).
