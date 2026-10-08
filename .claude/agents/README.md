# Équipe de subagents

Équipe de subagents spécialisés invoqués par la skill
[`execute-plan`](../skills/execute-plan/SKILL.md) pour exécuter un artefact
de plan rédigé par
[`plan-history-artifact-writer`](../skills/plan-history-artifact-writer/SKILL.md).

L'orchestration vit dans la session principale (skill `execute-plan`), pas
dans un subagent — pour garder le dialogue utilisateur, l'escalade et les
décisions en cours d'exécution.

> **Note — repo project (autonome).** Tooling forké du monorepo `xplor-demos` et
> re-scopé project (chemins, marque, skills `project-*`). Le **simulateur**
> (`maritime-drone-simulator/`) est un **repo externe** → les étapes `[simulator]`
> ne s'appliquent pas ici. Périmètres
> effectifs : `backend/`, `frontend/`, `mqtt_test_server/`, `documentation/`, racine.

## Rôles

| Subagent | Déclenché par tags | Scope | Skills chargées à la demande |
|---|---|---|---|
| [`backend-implementer`](./backend-implementer.md) | `[backend]`, `[simulator]`, `[docs]`, `[infra]` | `backend/`, `maritime-drone-simulator/`, `mqtt_test_server/`, `tools/`, `documentation/`, racine | `project-standards` si modèle de domaine touché |
| [`frontend-implementer`](./frontend-implementer.md) | `[frontend]` | `frontend/` uniquement | `frontend-ui-ux` si élément visuel touché |
| [`station-implementer`](./station-implementer.md) | `[station]`, `[contract]`, `[bord]` (logiciel seulement) | **dépôts frères** `C:\DEV\xplor-station` et `C:\DEV\xplor-contracts` uniquement ; lecture seule sur `project` ; aucun accès au banc | règles de `project-standards` si la forme d'un message ou d'un type de domaine est touchée |
| [`verifier`](./verifier.md) | gate rapide scopé après chaque étape (`step`) + gate complet unique en clôture (`final`) ; étape docs/config pure → relecture seule | lecture seule sur tout le repo + exécution lint/test/typecheck/build/preview | `project-standards` + `project-architecture` + `frontend-ui-ux` selon scope |
| [`documenter`](./documenter.md) | invoqué **une seule fois** en clôture (mode `write-full`), avec le `runId` et l'instantané du suivi | `documentation/history/executions/` uniquement (lecture seule sur `.etat/`) | — |

**Plans multi-dépôts (programme XPLOR)** — un seul plan, dans ce dépôt, peut
couvrir les dépôts frères `xplor-station` et `xplor-contracts` (tags `[station]`,
`[bord]`, `[contract]`) et le simulateur externe (`[simulator]`, exécuté dans
`C:\DEV\maritime-drone-simulator`). Le `station-implementer` a **quatre variantes
de profil, `station-implementer-opus-5-5-medium`** (profil par défaut), **`station-implementer-opus-5-5`,
`station-implementer-sonnet-5-5` et `station-implementer-opus-4-8`** ; sous un autre profil `opus-*`, il reste en inherit.

Les tags `[firmware]` et `[decision]`, et la partie matérielle de `[bord]`,
n'ont pas de specialist dédié :
- `[firmware]` → exécution manuelle hors orchestration (ESP32-C6, Raspberry Pi).
- `[bord]` matériel → geste sur le banc (Pi du système caméra, middleware,
  alimentation, câblage, horloge filmée) : manuel, conduit avec l'utilisateur.
- `[decision]` → pause utilisateur ; l'orchestrateur s'arrête, présente le
  contexte, attend une décision.

**Variantes de profil** — `backend-implementer-opus-*`,
`frontend-implementer-opus-*` et `verifier-opus-*` ne sont **pas** des rôles
autonomes : ce sont des variantes **déléguées** (frontmatter `model:` / `effort:`
distinct, corps relisant l'agent de base) sélectionnées par le profil
d'exécution — ne jamais router un tag directement dessus. Voir
[Profils d'exécution](#profils-dexécution-modèle--effort).

## Profils d'exécution (modèle / effort)

Au lancement d'un plan, `execute-plan` propose **neuf profils** qui fixent le
couple modèle / effort des subagents (**défaut `auto`**, court-circuitable par
`--profile=auto|herite|opus-4-6|opus-4-8|opus-5|opus-5-5|opus-5-5-medium|sonnet-5-5|sonnet`).
Quatre seulement tiennent en chips (`auto`, `opus-5-5-medium`, `sonnet-5-5`,
`opus-5-5`) — `opus-4-8`, `herite`, `sonnet`, `opus-5` et `opus-4-6`
s'obtiennent par le flag.

**Profil `auto` (défaut)** — le modèle est choisi **étape par étape** d'après le
niveau de complexité que le plan note après le tag de rôle
(`**[frontend]** _(simple)_`) : `simple` → `<role>-implementer-sonnet-5-5`
(Sonnet 5.5 @ medium), `standard` (défaut d'une étape sans marqueur) →
`<role>-implementer-opus-5-5-medium`, `complexe` → `<role>-implementer-opus-5-5`
(Opus 5.5 @ high). Le verifier reste `verifier-opus-5-5` (max) partout. Après un
échec du verifier, l'itération suivante monte d'un palier. Pour un plan sans
marqueurs, l'orchestrateur propose un classement et le fait valider au
démarrage. Grille et règles :
[`execute-plan/SKILL.md`](../skills/execute-plan/SKILL.md#profil-auto--routage-par-complexité).

Les quatre profils `opus-*` forment un **axe générationnel** : rôle, périmètre et
efforts identiques (implementers `high`, verifier `max`), seule la génération de
modèle change. Une exécution reste donc comparable d'une génération à l'autre, et
le journal consigne laquelle a tourné.

**Quel profil choisir** — le défaut n'est pas arbitraire, il est mesuré
([RESULTS-v3](../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v3.md),
9 runs, [RESULTS-v4](../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v4.md)
et [RESULTS-v5](../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v5.md),
6 runs chacun, sur étalon dur) :

- `auto` **par défaut** (depuis le 29/09) : ses trois paliers reprennent des
  profils mesurés ci-dessous ; le routage lui-même n'est pas encore mesuré,
  d'où le suivi par étape (palier, montée, tokens) dans le journal.
- `opus-5-5-medium` (palier `standard` d'`auto` ; défaut de V5 au 29/09) : à correction égale face à
  `opus-5-5` (high), −25 % de tokens, −27 % de temps, dispersion ×1,13 : mêmes
  variantes Opus 5.5 mais implementers à effort **medium** ; le verifier reste
  `verifier-opus-5-5` (max), filet de sécurité. L'effort d'une variante épinglée
  ne suit **pas** celui de la session — seul `herite` le suit — d'où ce profil
  dédié pour des sous-agents en medium.
- `sonnet-5-5` **mode économique** ([RESULTS-v6](../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v6.md) : à correction
  égale face au défaut, −55 % de coût de sortie, temps comparable) : implementers en Sonnet 5.5 @
  **medium** (2 $ / 10 $ le MTok, moitié du prix d'Opus 5.5), verifier gardé en
  `verifier-opus-5-5` (max). Sonnet 5.5 vise le code agentique courant ; pour
  le travail long-horizon le plus dur, Anthropic oriente vers un Opus.
- `opus-5-5` (high) **en choix explicite** pour un plan dur, ambigu,
  multi-fichiers ou long-horizon (défaut de V4 à V5). À correction égale (16/16, 10/10
  partout) face au témoin `opus-4-8`, **−37 % de coût de sortie** (−21 % de
  tokens × −20 % de prix) et **~2× plus rapide**. Moins régulier (×1,70 de
  dispersion contre ×1,34), mais son pire run reste sous la médiane d'`opus-4-8`.
  Son effort API par défaut est `medium` et sa réflexion ne se désactive pas —
  d'où l'effort épinglé dans le frontmatter des variantes.
- `opus-4-8` **en choix explicite** quand la prévisibilité du budget prime, et
  en repli si Opus 5.5 est indisponible. Défaut de V3 à V4.
- `opus-5` **en choix explicite** pour une étape dure, ambiguë ou long-horizon.
  Le benchmark ne le départage pas de `opus-4-8` (l'étalon est un petit module
  mono-fichier où la qualité sature) mais ne le réfute pas non plus : son
  avantage, s'il existe, vit au-dessus de ce qui est mesurable ici.
  **Supplanté par `opus-5-5`** (même lignée, plus cher par token, plus lent) ;
  accessible par le flag seulement.
- `opus-4-6` **déconseillé en production** : seul des trois à laisser des
  commentaires de délibération dans ses livrables (9 occurrences contre 0), et
  sur-producteur de tests redondants — sans être ni moins cher ni plus rapide.
  À garder comme instrument de comparaison.

Contrainte structurante : l'**effort** (`high` / `max`) ne se règle **que**
dans le frontmatter d'un agent (`effort:`) — jamais au lancement, où l'outil
`Agent` ne porte qu'un **tier** (`opus` / `sonnet` / `haiku` / `fable`) et
n'exprime aucune génération. Le routage par profil s'appuie donc sur des
**variantes déléguées** plutôt que sur la config globale : chaque variante
(`<role>-implementer-opus-*`, `verifier-opus-*`) porte uniquement un frontmatter
`model:` / `effort:` / `tools:` distinct et un corps mince qui relit l'agent de
base — source unique de vérité côté agent de base.

| Profil | implementers | verifier | documenter |
|---|---|---|---|
| `herite` | base (`<role>-implementer`), inherit session | `verifier` (inherit) | `documenter` (inherit) |
| `opus-4-6` | `<role>-implementer-opus-4-6` → Opus 4.6 @ **high** | `verifier-opus-4-6` → Opus 4.6 @ **max** | `documenter` (inherit) |
| `opus-4-8` | `<role>-implementer-opus-4-8` → Opus 4.8 @ **high** | `verifier-opus-4-8` → Opus 4.8 @ **max** | `documenter` (inherit) |
| `opus-5` | `<role>-implementer-opus-5` → Opus 5 @ **high** | `verifier-opus-5` → Opus 5 @ **max** | `documenter` (inherit) |
| `opus-5-5` | `<role>-implementer-opus-5-5` → Opus 5.5 @ **high** | `verifier-opus-5-5` → Opus 5.5 @ **max** | `documenter` (inherit) |
| `opus-5-5-medium` | `<role>-implementer-opus-5-5-medium` → Opus 5.5 @ **medium** | `verifier-opus-5-5` → Opus 5.5 @ **max** | `documenter` (inherit) |
| `sonnet-5-5` | `<role>-implementer-sonnet-5-5` → Sonnet 5.5 @ **medium** | `verifier-opus-5-5` → Opus 5.5 @ **max** | `documenter` (inherit) |
| **`auto`** _(défaut)_ | par étape : `simple` → `*-sonnet-5-5`, `standard` → `*-opus-5-5-medium`, `complexe` → `*-opus-5-5` | `verifier-opus-5-5` → Opus 5.5 @ **max** | `documenter` (inherit) |
| `sonnet` | base + paramètre `model: 'sonnet'` | `verifier-opus-5` → Opus 5 @ **max** | `documenter` (inherit) |

`<role>` ∈ {`backend`, `frontend`}. Le profil `herite` reproduit à l'identique
le comportement historique (aucun `model` / `effort` injecté) et suit donc la
session ; les profils `opus-*` **épinglent** au contraire une génération, ce qui
rend l'exécution reproductible. Le `documenter` reste en inherit dans tous les
profils. Détail du mapping et mode dégradé :
[`execute-plan/SKILL.md`](../skills/execute-plan/SKILL.md#profils-dexécution-modèle--effort).

**Resynchronisation des `tools:`** — le frontmatter d'une variante n'hérite
**pas** de l'agent de base : si la ligne `tools:` d'un agent de base évolue,
reporter le changement dans la variante correspondante.

## Contrats de rapport

Chaque subagent termine ses invocations par un rapport markdown structuré,
dont le schéma est défini dans
[`execute-plan/SKILL.md`](../skills/execute-plan/SKILL.md). C'est la source
de vérité — les fichiers de chaque subagent rappellent le schéma mais ne
le redéfinissent pas.

## Politique de convergence

`max_iterations = 3` par étape pour la boucle implement ↔ verify. Au 3ᵉ
échec consécutif, l'orchestrateur escalade vers l'utilisateur (rapport
verifier complet, liste des `suggestedFix` non appliqués, choix
fix-manuel / skip / abandon).

## Cycle de vie d'un subagent

Tous les subagents sont **stateless** : à chaque invocation, ils
reçoivent leur contexte complet (étape, rapports précédents pertinents,
sections de plan utiles) via le prompt. Ils n'ont pas mémoire d'une
invocation à l'autre — c'est l'orchestrateur qui assure la continuité via
le suivi d'exécution, puis le journal d'exécution en clôture.

**Suivi d'exécution** — pendant l'exécution, l'orchestrateur publie chaque
transition (lancement d'un agent, rapport, verdict, attente utilisateur,
interruption, reprise, clôture) avec `tools/history/run-tracker.mjs`, dans
`documentation/history/executions/.etat/` (ignoré par git). Les subagents n'y
écrivent **jamais** et ne lancent pas l'outil : leur rapport structuré reste
leur seule sortie, et c'est l'orchestrateur qui le consigne. Le statut du plan,
le `status` d'un rapport implementer et le `verdict` du verifier y restent
trois informations distinctes. Contrat :
[`tools/history/README.md`](../../tools/history/README.md) ; procédure :
[`execute-plan/SKILL.md`](../skills/execute-plan/SKILL.md#suivi-dexécution-publié).

**Transparence du format de plan source** — qu'un plan soit en format
monolithique (`.md` unique) ou sharded (`<slug>/index.md` + fichiers par
section), c'est transparent pour les subagents. L'orchestrateur
(`execute-plan`) résout le format en Phase 1.0 et fournit toujours l'étape
complète dans le prompt du specialist. Les subagents n'ont jamais à se
soucier de la forme physique du plan.

## Pour ajouter un nouveau rôle

1. Définir un nouveau tag dans la table « Role tags » de
   [`plan-history-artifact-writer/SKILL.md`](../skills/plan-history-artifact-writer/SKILL.md#role-tags-section-6).
2. Créer `.claude/agents/<nom>.md` avec frontmatter `name`,
   `description`, `tools` (restreints au scope minimal nécessaire).
3. Documenter le scope autorisé, les invariants à respecter, le format de
   rapport, les interdictions.
4. Ajouter une ligne dans la table de ce README.
5. Mettre à jour la table de routing dans `execute-plan/SKILL.md` si le
   nouveau tag a un specialist dédié.
