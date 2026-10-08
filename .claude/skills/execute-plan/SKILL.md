---
name: execute-plan
description: >-
  Orchestre l'exécution d'un artefact de plan (`documentation/history/tasks/*.md`
  ou `documentation/history/fixes/*.md`) en déléguant chaque étape à un
  subagent specialist (`backend-implementer`, `frontend-implementer`),
  en faisant vérifier le résultat par le subagent `verifier`, et en
  consignant le déroulé via le subagent `documenter`. Pilote la boucle
  implement ↔ verify avec une politique de convergence bornée (max 3
  itérations), gère les étapes transverses par découpage séquentiel
  mono-rôle, et escalade vers l'utilisateur quand la boucle ne converge
  pas ou quand une étape `[decision]` est rencontrée. À déclencher quand
  l'utilisateur demande d'exécuter, de dérouler ou de lancer un plan
  existant — y compris s'il référence l'artefact par titre, par slug ou
  par chemin. Ne pas déclencher pour la création d'un plan (utiliser
  `plan-history-artifact-writer`) ni pour des modifications hors plan.
---

# Execute Plan — orchestrateur d'exécution

Cette skill exécute un artefact de plan rédigé par
[`plan-history-artifact-writer`](../plan-history-artifact-writer/SKILL.md),
en pilotant une équipe de subagents specialists isolés.

L'orchestration vit dans la session principale (cette skill), **pas** dans un
subagent : cela garantit l'interactivité (dialogue utilisateur, escalade,
décision en cours d'exécution).

## Entrée

Un chemin vers un artefact, fourni explicitement par l'utilisateur ou résolu
depuis un titre / slug via `documentation/history/INDEX.md`.

Exemples acceptés :

- `documentation/history/tasks/2026-05-27_08-14_task_agent-team-orchestrated-plan-execution.md`
- « exécute le plan agent-team-orchestrated » → résoudre via INDEX.md
- « lance la vague 0 du command-center » → résoudre dans `tasks/command-center/`

## Préconditions

1. L'artefact existe et est lisible.
2. Son frontmatter a `status: ready-to-execute` ou `plan`. Si `status: done`,
   refuser sauf re-run explicite (`--rerun`). Si `status: executing`, ou si
   l'utilisateur passe `--reprendre`, c'est une **reprise** : suivre
   [Reprise d'une exécution](#reprise-dune-exécution) au lieu de la Phase 1.
3. La section 6 du plan existe. Si ses bullets ne sont pas taggés
   (`[role]` au début), **proposer à l'utilisateur** des tags inférés à partir
   du contenu de chaque bullet, sans modifier le fichier source (les tags sont
   stockés en mémoire d'exécution).
4. Les subagents de base `backend-implementer`, `frontend-implementer`,
   `verifier`, `documenter` existent sous `.claude/agents/`, avec les règles
   communes sous `agents/references/`. Pour une étape `[station]`, `[bord]`
   logicielle ou `[contract]`, `station-implementer` doit exister aussi.
   Chaque checkout et périmètre d'écriture est explicitement résolu depuis
   le plan ; aucune cible ne dépend d'un nom de dépôt ou d'un chemin machine.
5. Les variantes de profil ne sont requises que si le profil d'exécution
   retenu (Phase 1, étape 0) les sollicite — la vérification de leur présence
   est donc **différée** à la résolution du profil :
   - profils `opus-4-6` / `opus-4-8` / `opus-5` / `opus-5-5` → `backend-implementer-<profil>`,
     `frontend-implementer-<profil>`, `verifier-<profil>` (le nom du profil est
     littéralement le suffixe du fichier d'agent) ;
   - profil `opus-5-5-medium` → `backend-implementer-opus-5-5-medium`,
     `frontend-implementer-opus-5-5-medium` et `verifier-opus-5-5` (le verifier
     garde l'effort `max` : seul l'effort des implementers baisse) ;
   - profil `sonnet-5-5` → `backend-implementer-sonnet-5-5`,
     `frontend-implementer-sonnet-5-5` et `verifier-opus-5-5` (vérification
     gardée en Opus 5.5 @ max) ;
   - profil `auto` → les trois paliers de chaque rôle d'implémentation
     (`<role>-implementer-sonnet-5-5`, `<role>-implementer-opus-5-5-medium`,
     `<role>-implementer-opus-5-5`) et `verifier-opus-5-5` ;
   - profil `sonnet` → `verifier-opus-5` ;
   - profil `herite` → aucune variante.
   Une variante requise mais absente déclenche le [Mode dégradé](#mode-dégradé).

## Contrat du projet cible

Avant le dispatch, relever les instructions locales existantes, les critères
et règles métier du plan, les checkouts et chemins autorisés, puis les commandes
applicables dans les manifests, la CI et la documentation. Les skills du projet
et intégrations de recherche/preview sont utilisées lorsqu'elles existent ;
aucune stack, norme de domaine, commande npm ou skill métier n'est imposée.

Chaque prompt d'agent transmet : `planningRoot`, racine du dépôt de planification (pour lire
les prompts et les règles communes), racine du checkout d'exécution, clé
`repo`, chemins autorisés, critères d'acceptation et contrôles requis avec
leur commande et répertoire. Une cible ambiguë bloque le dispatch jusqu'à
résolution. Les autorisations et décisions déjà données restent applicables.

Le tag choisit un rôle ; le plan choisit un dépôt. Dans le suivi, `project`
désigne le checkout principal par défaut. Toute cible extérieure est déclarée
dans `repos` et chaque étape concernée reçoit explicitement `repo` ; le tracker
n'infère pas de dépôt à partir de `[station]`, `[contract]` ou `[simulator]`.

## Procédure

### Phase 1.0 — Résolution du plan

Avant toute lecture, résoudre la forme physique de l'artefact (mono-fichier
vs sharded) à partir du `<chemin>` fourni en entrée :

a. Si `<chemin>.md` existe → **mode mono**, lire le fichier entier.
b. Sinon si `<chemin sans .md>/index.md` existe → **mode sharded**, lire
   `index.md` et composer la lecture des sections à la demande.
c. Si les deux existent → **mode mono** (avec warning console :
   « doublon détecté, mono utilisé »).
d. Si aucun → erreur, refus de lancer.

**Lecture incrémentale en mode sharded** :

- Frontmatter + sections 1 à 3 (contexte, problème, objectifs) : depuis
  `index.md`, à la résolution.
- Sections 4 (Périmètre), 5 (Hors périmètre), 8 (Modifications attendues),
  9 (Validation) : lues à l'init de **Phase 2** et transmises aux
  specialists (politique de troncature inchangée — toujours intégrales).
- Section 6 (Plan proposé) : chaque étape est lue depuis
  `06-plan-propose/<n>-<slug>.md` **au moment** de son invocation
  specialist, pas en bloc en Phase 1.

**Lien vers le brief** : si le frontmatter du plan contient un champ
`relatedBrief:`, lire le brief référencé. Si son `status: obsolete`,
**prévenir l'utilisateur** (warning, **pas un blocage** — l'exécution
continue).

### Phase 1 — Préparation

0. **Résolution du profil d'exécution** (modèle / effort des subagents) :
   - Si l'utilisateur a passé
     `--profile=auto|herite|opus-4-6|opus-4-8|opus-5|opus-5-5|opus-5-5-medium|sonnet-5-5|sonnet`, retenir cette
     valeur sans prompt.
   - Sinon, présenter via `AskUserQuestion` les **4 profils exposés en chips**
     (`AskUserQuestion` plafonne à 4 options), **défaut `auto`** :
     - **Auto** (`auto`) — le modèle est choisi **étape par étape** selon son
       niveau de complexité : Sonnet 5.5 @ medium pour une étape **simple**,
       Opus 5.5 @ medium pour une étape **standard**, Opus 5.5 @ high pour une
       étape **complexe** ; verifier en Opus 5.5 @ max partout ; montée de
       palier automatique après un échec du verifier (cf.
       [Profil `auto`](#profil-auto--routage-par-complexité)) ;
     - **Opus 5.5 medium** (`opus-5-5-medium`) — tout le plan en Opus 5.5 @
       medium, verifier en max. Mesuré à correction égale face à `opus-5-5`
       (high) : −25 % de tokens, −27 % de temps, le plus régulier (×1,13) (cf.
       [RESULTS-v5](../../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v5.md)) ;
     - **Sonnet 5.5** (`sonnet-5-5`) — tout le plan en Sonnet 5.5 @ medium,
       verifier en Opus 5.5 @ max. Mesuré à correction égale face à
       `opus-5-5-medium` : −55 % de coût de sortie, temps comparable (cf.
       [RESULTS-v6](../../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v6.md)). Mode économique pour un plan entièrement simple ou bien spécifié ;
     - **Opus 5.5 high** (`opus-5-5`) — tout le plan en Opus 5.5 @ high,
       verifier en max. Pour un plan **dur, ambigu, multi-fichiers ou
       long-horizon** de bout en bout (cf. [RESULTS-v4](../../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v4.md)).
     Les autres profils ne sont pas exposés en chip, accessibles par
     `--profile=` : **`opus-4-8`**, le plus régulier (×1,34 contre ×1,70 pour
     Opus 5.5 high) et repli si Opus 5.5 est indisponible (cf. [RESULTS-v3](../../../documentation/history/benchmarks/execute-plan-profiles/RESULTS-v3.md)) ;
     **`herite`**, où tous les subagents héritent du modèle / effort de la
     session (comportement historique) ; **`sonnet`** (implementers en Sonnet
     non épinglé, verifier en Opus 5 @ max), supplanté par `sonnet-5-5` ;
     **`opus-5`**, supplanté par `opus-5-5` (même lignée, plus cher par token,
     plus lent) et gardé pour la comparaison générationnelle ; **`opus-4-6`**,
     **déconseillé en production** — ni moins cher ni plus rapide que
     `opus-4-8`, et le seul à laisser des commentaires de délibération dans ses
     livrables.
   - En contexte non interactif (headless) où `AskUserQuestion` ne peut
     s'afficher, retenir le **défaut `auto`**.
   - Vérifier alors les préconditions de variantes (cf. Préconditions, point 5) ;
     une variante requise mais absente déclenche le [Mode dégradé](#mode-dégradé)
     pour le seul rôle concerné. Un modèle **refusé au dispatch** (version de
     Claude Code trop ancienne — Opus 5.5 exige ≥ 2.1.280) déclenche en cours
     de boucle une **interruption avec question** : dégrader ou interrompre
     (cf. [Mode dégradé](#mode-dégradé)).
   - Stocker le profil retenu en mémoire d'exécution (mapping détaillé en
     [Profils d'exécution](#profils-dexécution-modèle--effort)).
1. Lire l'artefact en entier.
2. Faire basculer son `status` à `executing` (édition du frontmatter). La
   bascule est consignée au suivi juste après l'ouverture du run (étape 9).
3. Construire la liste ordonnée des étapes depuis la section 6, en associant
   à chaque étape : numéro, tag(s), contenu textuel, et **niveau de
   complexité** (`simple` / `standard` / `complexe`) lu dans son marqueur.
3 bis. **Profil `auto` seulement — classement des étapes.** Pour chaque étape
   exécutée par un implementer, retenir le niveau de son marqueur (cf.
   [Profil `auto`](#profil-auto--routage-par-complexité)). Pour une étape
   **sans marqueur**, proposer un niveau d'après la grille, sans modifier le
   fichier source. Présenter ensuite le tableau
   `étape — tag — titre — niveau — modèle — origine (marqueur / proposé)` et le
   faire valider via `AskUserQuestion` : **Valider le classement**, **Tout en
   standard** (ignore les niveaux proposés, garde les marqueurs), ou une
   correction libre (« Other », par exemple « 4 et 7 en complexe »). Si toutes
   les étapes portent un marqueur, afficher le tableau sans poser la question.
   En contexte non interactif, appliquer marqueurs et propositions sans
   question, et consigner les propositions au journal.
4. Pour les tags composés (`[a+b]`), créer N sous-étapes séquentielles dans
   la liste d'exécution (`1.a`, `1.b`), chacune mono-rôle, héritant du
   contenu mais avec instruction de ne traiter que la dimension `a` puis `b`.
5. Pour les étapes `[decision]` : marquer comme « pause utilisateur » — pas de
   subagent invoqué, l'orchestrateur s'arrête, présente le contexte, attend
   instruction.
5 bis. Pour les étapes **manuelles** — `[firmware]`, ou une étape `[bord]`
   qui exige un geste matériel — ne pas invoquer d'implémenteur. Publier une
   attente `manual`, conduire l'étape avec l'utilisateur selon ses autorisations
   et les règles d'accès du projet, puis consigner le résultat. Une étape mêlant
   logiciel et matériel est découpée ; seul le logiciel est délégué.
6. Décider du mode worktree : par défaut **off**. Si l'utilisateur a passé
   `--isolated` ou demande l'isolement, activer `isolation: 'worktree'` pour
   les invocations specialists.
7. Le champ sync Gitea reste réservé et **off** par défaut. Si `--sync-gitea`,
   signaler que la synchronisation n'est pas implémentée dans ce workflow ;
   ne l'activer que si le projet fournit explicitement une intégration.
8. **Ne pas** invoquer le `documenter` à l'initialisation. Le journal
   d'exécution est désormais écrit en **une seule passe** en Phase 3 (clôture),
   à partir des résumés d'étapes accumulés en mémoire d'exécution tout au long
   de la boucle. Conserver dès maintenant en mémoire les métadonnées nécessaires
   à l'init du journal : timestamp de démarrage, chemin/slug/titre du plan,
   **profil d'exécution**, mode isolation, mode sync Gitea, liste des étapes
   inférées (avec leur niveau et son origine sous le profil `auto`).
9. **Ouvrir le run de suivi** (cf.
   [Suivi d'exécution publié](#suivi-dexécution-publié)) : écrire la liste
   d'exécution dans
   `documentation/history/executions/.etat/init-<slug>.json`, lancer
   `node tools/history/run-tracker.mjs init --from <ce fichier>`, retenir le
   `runId` rendu, puis `plan-status --to executing`. À partir de là, **chaque
   transition** de la boucle est publiée par une commande du tableau de cette
   section, au moment où elle se produit — jamais en lot à la fin.

### Phase 2 — Boucle d'exécution par étape

Pour chaque étape dans l'ordre :

1. **Si tag = `[decision]`** : publier `wait --step <n> --reason decision`,
   présenter à l'utilisateur le contenu de l'étape et les éléments de contexte
   pertinents (sections 4, 5, 7 de l'artefact), attendre une décision, puis
   publier `resolve --step <n> --action done --note "<décision>"` et passer à
   l'étape suivante en **accumulant la décision en mémoire d'exécution** (texte
   intégral de la décision) pour le journal — sans invoquer le `documenter` à
   ce stade. Une étape **manuelle** (Phase 1, étape 5 bis) suit le même
   schéma avec `--reason manual`.

2. **Sinon** :

   Pour une étape `[verify]`, sauter a. et b. et invoquer directement le
   verifier du profil en c., avec le plan et les artefacts à contrôler, sans
   rapport implementer fictif. Publier son lancement et son rapport sur cette
   étape. Un échec nécessitant du code retourne à l'étape d'implémentation
   autorisée qui le produit ; si elle n'existe pas ou que le périmètre manque,
   escalader pour définir la correction. Ne pas inventer un implementer pour
   ce tag. La vérification seule peut être relancée après remise en état.

   a. **Invocation specialist** — le `subagent_type` et le paramètre `model`
      dépendent du **profil d'exécution** retenu en Phase 1 (cf.
      [Profils d'exécution](#profils-dexécution-modèle--effort)) :
      ```
      Agent({
        subagent_type: <selon profil>,  // herite|sonnet: '<role>-implementer' · opus-*|sonnet-5-5: '<role>-implementer-<profil>' · auto: selon le palier de l'étape
        model: <selon profil>,          // sonnet: 'sonnet' · tous les autres : omis (inherit / frontmatter)
        prompt: <prompt construit>,
        isolation: 'worktree' si phase 1 a activé l'isolement
      })
      ```
      `<role>` ∈ {`backend`, `frontend`, `station`}. La clé `isolation` reste
      orthogonale au profil. Sous le profil `auto`, le palier de l'étape (qui
      peut monter en cours de boucle, cf. d.) choisit la variante : `simple` →
      `<role>-implementer-sonnet-5-5`, `standard` →
      `<role>-implementer-opus-5-5-medium`, `complexe` →
      `<role>-implementer-opus-5-5`.

      **Suivi** — publier `launch --role implementer --agent <subagent_type>
      --step <n>` **dans le même message** que l'appel `Agent`, avant lui. Au
      retour : `report --step <n> --status <status du rapport> --files
      <fichiers touchés>` ; si l'appel `Agent` échoue sans rendre de rapport,
      `launch-failed --role implementer --step <n> --error "<erreur>"`. Même
      règle pour le `verifier` (c.) et pour le gate final.

      **Routage tag → rôle** (source : table « Role tags » de
      `plan-history-artifact-writer`) :

      | Tag | `<role>` | Dépôt d'exécution |
      |---|---|---|
      | `[backend]`, `[docs]`, `[infra]`, `[simulator]` | `backend` | checkout déclaré par le plan |
      | `[frontend]` | `frontend` | checkout déclaré par le plan |
      | `[station]`, `[contract]`, `[bord]` logiciel | `station` | checkout déclaré par le plan |
      | `[verify]` | verifier du profil, sans implémentation | checkouts et artefacts déclarés |
      | `[bord]` matériel, `[firmware]` | aucun — manuel | cible et accès définis par le plan |

      **Étapes dans un autre dépôt** : vérifier son état et la branche attendue,
      les permissions du plan et ses commandes propres. Ne pas appliquer le
      worktree du dépôt principal à cette cible : fournir son checkout exact.
      Le rôle `station` dispose des variantes `sonnet-5-5`, `opus-5-5-medium`,
      `opus-5-5` et `opus-4-8` ; sous un autre profil épinglé, consigner le
      fallback `herite` pour ce rôle (voir Mode dégradé).
      Le prompt construit inclut :
      - le contrat du projet cible ci-dessus, avec périmètres et contrôles ;
      - le contenu textuel de l'étape (avec son tag) ;
      - les sections **4 (Périmètre)**, **5 (Hors périmètre)**, **8 (Modifications attendues)**, **9 (Validation)** de l'artefact ;
      - les rapports verifier des étapes précédentes pertinentes (au moins étape n-1 et toutes les étapes `[decision]` ou `[verify]`) — résumés pour les étapes anciennes, intégral pour les 2 dernières ;
      - une référence explicite au schéma de rapport (voir [Schéma rapport implementer](#schéma-rapport-implementer-→-orchestrateur)).

   b. **Validation du rapport implementer** : le rapport doit respecter le
      schéma. Si non conforme, redemander une seule fois en pointant le
      manque ; si toujours non conforme, escalader (`wait --step <n> --reason
      non-conformant-report`). Un rapport `blocked` met l'étape en attente
      utilisateur : le suivi le fait de lui-même à la publication du rapport.

   c. **Invocation verifier** — le `subagent_type` dépend du **profil**
      (`herite` → `verifier` ; `opus-*` → `verifier-<profil>`, sauf `opus-5-5-medium` → `verifier-opus-5-5` ; `sonnet-5-5` et `auto` → `verifier-opus-5-5` ; `sonnet` →
      `verifier-opus-5`) :
      ```
      Agent({
        subagent_type: <selon profil>,  // herite: 'verifier' · opus-*: 'verifier-<profil>' (opus-5-5-medium: 'verifier-opus-5-5') · sonnet-5-5|auto: 'verifier-opus-5-5' · sonnet: 'verifier-opus-5'
        prompt: contrat du projet cible + rapport implementer + étape + section 9 + scope rapporté
      })
      ```
      **Vérification à deux étages.** Le vérificateur applique les modes de
      `.claude/agents/verifier.md` : `docs-config` pour la documentation et les
      configurations strictement statiques, `step` pour le code, les fixtures,
      les schémas exécutés et les configurations qui changent le comportement.
      Le contenu et ses consommateurs décident du mode, pas le suffixe.

      Les contrôles de l'étape sont indépendants et ciblés sur son impact.
      Un contrôle complet ne peut être différé au gate final que si le plan
      et les règles du projet l'autorisent. Les tests des appelants impactés
      restent dans le périmètre de vérification, même hors du diff.

      Une commande requise indisponible est un `fail` bloquant de règle
      `environnement`, jamais un `skipped`. L'orchestrateur applique les
      instructions de remise en état du projet dans le checkout concerné,
      sans inventer de commande d'installation ni modifier de baseline,
      puis relance le vérificateur. Ce détour ne compte pas comme une nouvelle
      itération de code. Si l'obstacle reste non résolu, publier une attente
      utilisateur au lieu de boucler. Pour les dépôts externes, appliquer le
      même contrat avec leurs commandes propres.

      Le verdict de ce gate rapide pilote la boucle implement ↔ verify de
      l'étape courante.

   d. **Décision selon `verdict`** :
      - `pass` ou `pass-with-notes` : afficher les notes éventuelles, marquer
        l'étape réussie (la publication du rapport verifier, `report --step <n>
        --mode <mode> --verdict <verdict>`, clôt l'étape au suivi),
        **accumuler en mémoire d'exécution** un résumé de
        l'étape (numéro, tag, titre, itérations, verdict, fichiers touchés,
        notes verifier, et **par itération** le subagent / modèle utilisé et
        les `subagent_tokens` rapportés par l'outil `Agent`) pour le journal —
        **sans** invoquer le `documenter` à ce stade. Passer à l'étape suivante.
      - `fail` : ré-invoquer le specialist avec le rapport verifier en entrée
        et `iteration: n+1` — sauf si le seul item bloquant est de règle
        `environnement` (contrôle requis indisponible) : appliquer la remise
        en état documentée puis ré-invoquer le `verifier`, cf. c. Sous le
        profil `auto`, l'itération suivante
        **monte d'un palier** (`simple` → `standard` → `complexe` ; un palier
        `complexe` reste `complexe`) : le nouveau specialist reçoit le rapport
        verifier et reprend l'état laissé par le précédent. Annoncer la montée
        en une ligne et la consigner au journal (étape, palier de départ,
        palier atteint).

   e. **Convergence** : `max_iterations = 3` par étape. Au 3ᵉ échec consécutif,
      escalader : afficher rapport verifier complet, lister les
      `suggestedFix` non appliqués, attendre instruction utilisateur (fix
      manuel, skip de l'étape, abandon du plan). Le rapport verifier publié
      avec `--action escalate-to-user` met l'étape en attente ; la réponse se
      publie par `resolve --step <n> --action done | skip | abort | retry`
      (`done` : correctif manuel accepté par l'utilisateur, sans verdict du
      verifier).

### Phase 3 — Clôture

1. **Gate final** — si au moins une étape a touché du code, si un contrôle
   a été différé, ou si le plan exige une validation finale même statique, invoquer le verifier du profil (`herite` → `verifier` ;
   `opus-*` → `verifier-<profil>`, sauf `opus-5-5-medium` → `verifier-opus-5-5` ; `sonnet-5-5` et `auto` → `verifier-opus-5-5` ; `sonnet` → `verifier-opus-5`) une dernière fois en
   **mode `final`** : il relance les contrôles complets exigés par le plan et
   la CI pour chaque sous-projet et checkout touché, puis vérifie l'intégration
   entre étapes et les parcours d'acceptation applicables. Aucun langage,
   outil de build ou protocole UI n'est imposé. Les contrôles pertinents
   différés pendant les étapes sont joués ici. Le gate final couvre aussi
   les dépôts externes avec leurs commandes et répertoires propres.
   - `pass` / `pass-with-notes` : continuer la clôture.
   - `fail` : **escalader** à l'utilisateur — afficher le rapport `final`, en
     indiquant les étapes dont les fichiers touchent les zones en échec
     (candidates à la régression), et attendre instruction (fix manuel +
     re-run du gate final, ou clôture en l'état avec statut `escalated`). Ne
     pas relancer la boucle automatiquement.

   Le gate final se publie comme un agent sans étape : `launch --role verifier
   --agent <subagent_type> --mode final`, puis `report --mode final --verdict
   <verdict>` (un `fail` met le run en attente utilisateur).
2. Invoquer le `documenter` **une seule fois** (mode `write-full`) en lui
     transmettant : les métadonnées d'init conservées en Phase 1 (timestamp de
     démarrage, chemin/slug/titre du plan, **profil d'exécution**, isolation,
     sync Gitea, étapes inférées), **tous** les résumés d'étapes accumulés en
     mémoire d'exécution
     (dans l'ordre, décisions `[decision]` incluses), et le récap de clôture
     (étapes réussies / escaladées / skippées, timestamp de fin, suggestion de
     commit). Le `documenter` écrit le fichier journal complet d'un coup.
     Lui transmettre aussi le **`runId`** et le chemin de l'instantané
     `documentation/history/executions/.etat/<runId>.state.json` : le journal
     se nomme `<runId>.md`, et l'instantané fait foi en cas d'écart avec les
     résumés. Publier `launch --role documenter --agent documenter` avant
     l'appel, `report --role documenter --status ok --journal <chemin>` au
     retour, puis **clore le run** : `close --outcome completed | escalated |
     aborted`. Une clôture `completed` est refusée tant qu'une étape n'est ni
     faite, ni ignorée, ni escaladée.
3. Demander à l'utilisateur s'il veut basculer le `status` du plan à `done`.
   S'il confirme : éditer le frontmatter, puis `plan-status --to done`. S'il
   refuse : `plan-status --done-declined`. La clôture du run ne vaut jamais
   passage à `done`.
4. Si `kind: fix` et que le plan tient en une étape avec succès au premier
   essai, garder un journal bref contenant les mêmes faits et contrôles.
   Le journal est toujours écrit une seule fois à la clôture.
5. Produire un récap dans la conversation : liste des étapes, verdict de
   chacune, résultat du gate final, chemin du journal d'exécution, suggestion
   de commande de commit (ne **jamais** committer automatiquement).

## Profils d'exécution (modèle / effort)

Le profil retenu en Phase 1 (étape 0) détermine le couple modèle / effort de
chaque subagent. Contrainte structurante : l'**effort** (`high` / `max`) ne
se règle **que** dans le frontmatter d'un fichier d'agent (`effort:`), jamais
au lancement ; le paramètre `model` de l'outil `Agent` ne porte qu'un **tier**
(`opus` / `sonnet` / `haiku` / `fable`), jamais une génération précise. Le
routage par profil s'appuie donc sur des **variantes d'agents déléguées**
(`<role>-implementer-opus-*`, `verifier-opus-*` — corps minces relisant l'agent
de base) plutôt que sur la config globale ou une variable d'environnement.

Les quatre profils `opus-*` forment un **axe générationnel** : même rôle, même
périmètre, mêmes efforts (implementers `high`, verifier `max`) — seule la
génération de modèle change. C'est ce qui rend une exécution comparable d'une
génération à l'autre, et ce que le journal d'exécution consigne.

| Profil | implementer `subagent_type` | implementer `model` | verifier `subagent_type` | documenter |
|---|---|---|---|---|
| `herite` | `<role>-implementer` | _(aucun → inherit session)_ | `verifier` | `documenter` (inherit) |
| `opus-4-6` | `<role>-implementer-opus-4-6` | _(aucun → frontmatter opus-4-6 / high)_ | `verifier-opus-4-6` | `documenter` (inherit) |
| `opus-4-8` | `<role>-implementer-opus-4-8` | _(aucun → frontmatter opus-4-8 / high)_ | `verifier-opus-4-8` | `documenter` (inherit) |
| `opus-5` | `<role>-implementer-opus-5` | _(aucun → frontmatter opus-5 / high)_ | `verifier-opus-5` | `documenter` (inherit) |
| `opus-5-5` | `<role>-implementer-opus-5-5` | _(aucun → frontmatter opus-5-5 / high)_ | `verifier-opus-5-5` | `documenter` (inherit) |
| `opus-5-5-medium` | `<role>-implementer-opus-5-5-medium` | _(aucun → frontmatter opus-5-5 / **medium**)_ | `verifier-opus-5-5` (max) | `documenter` (inherit) |
| `sonnet-5-5` | `<role>-implementer-sonnet-5-5` | _(aucun → frontmatter sonnet-5-5 / **medium**)_ | `verifier-opus-5-5` (max) | `documenter` (inherit) |
| **`auto`** _(défaut)_ | par palier d'étape : `simple` → `<role>-implementer-sonnet-5-5`, `standard` → `<role>-implementer-opus-5-5-medium`, `complexe` → `<role>-implementer-opus-5-5` | _(aucun → frontmatter)_ | `verifier-opus-5-5` (max) | `documenter` (inherit) |
| `sonnet` | `<role>-implementer` | `sonnet` | `verifier-opus-5` | `documenter` (inherit) |

`<role>` ∈ {`backend`, `frontend`} pour toutes les variantes ; le rôle `station`
(intégrations déclarées) n'a que les variantes `station-implementer-opus-5-5`,
`station-implementer-opus-5-5-medium`, `station-implementer-sonnet-5-5` et `station-implementer-opus-4-8`, et reste en `station-implementer` (inherit) sous
les autres profils `opus-*`. **Défaut** si aucun flag `--profile=` ni
réponse au prompt : `auto`. Ses paliers reprennent des profils mesurés
(`sonnet-5-5` en V6, `opus-5-5-medium` en V5, `opus-5-5` en V4) ; le routage
lui-même n'est pas encore mesuré, d'où le suivi par étape au journal.
Défauts précédents : `opus-5-5-medium` (V5), `opus-5-5` (V4), `opus-4-8` (V3).
Seuls 4 profils sont exposés en chips (`auto`, `opus-5-5-medium`,
`sonnet-5-5`, `opus-5-5`) ; `opus-4-8`, `herite`, `sonnet`, `opus-5` et
`opus-4-6` s'obtiennent par `--profile=`.

**Effort explicite obligatoire sur Opus 5.5** — son effort par défaut côté API
est `medium` (un cran sous Opus 5) et sa réflexion ne se désactive pas : les
variantes `*-opus-5-5` fixent donc `effort: high` / `max` dans leur frontmatter,
comme les autres générations, pour garder l'axe comparable.

**Effort des sous-agents ≠ effort de la session** — une variante épinglée garde
son `effort:` de frontmatter quel que soit l'effort de la session lanceuse ;
seul le profil `herite` suit la session. Pour baisser l'effort des
implementers, il faut donc un profil dédié (`opus-5-5-medium`), jamais un
réglage au lancement : l'outil `Agent` ne porte pas d'effort. Le
`documenter` reste en **inherit** dans tous les profils. Si une variante requise
est absente, voir [Mode dégradé](#mode-dégradé).

## Profil `auto` — routage par complexité

Le profil `auto` choisit l'implementer **étape par étape**. Le verifier reste
`verifier-opus-5-5` (max) sur toutes les étapes et au gate final : c'est lui
qui rend sûre l'économie faite sur les étapes simples.

**Marqueur dans le plan.** Le niveau s'écrit juste après le tag de rôle, en
italique : `**[frontend]** _(simple)_`, `**[backend]** _(complexe)_`. Valeurs :
`simple`, `standard`, `complexe`. Une étape sans marqueur est `standard`, sauf
proposition contraire validée en Phase 1 (étape 3 bis). Les tags composés
(`[a+b]`) transmettent leur niveau à chacune de leurs sous-étapes. Les étapes
`[decision]`, `[verify]`, `[firmware]` et `[bord]` matériel n'ont pas de niveau.

| Palier | Implementer | Modèle / effort |
|---|---|---|
| `simple` | `<role>-implementer-sonnet-5-5` | Sonnet 5.5 @ medium |
| `standard` | `<role>-implementer-opus-5-5-medium` | Opus 5.5 @ medium |
| `complexe` | `<role>-implementer-opus-5-5` | Opus 5.5 @ high |

**Grille de classement** (partagée avec `plan-history-artifact-writer`) :

- **`complexe`** dès qu'**un** critère est vrai : architecture ou nouveau
  module structurant ; modèle de domaine, schéma de persistance ou migration de
  données ; contrat entre composants (API, format partagé ou contrat externe) ; plusieurs sous-projets ou plusieurs dépôts dans la même
  étape ; concurrence, temps réel, rejeu ou performance ; sécurité, autorité de
  contrôle ; spécification ambiguë ou écarts encore à arbitrer ; étape déjà
  échouée lors d'une exécution précédente.
- **`simple`** seulement si **tous** les critères sont vrais : la spécification
  est explicite et ne laisse aucun choix de conception ; un ou deux fichiers
  dans un seul sous-projet ; la nature est mécanique (documentation, config,
  renommage ou déplacement, textes d'interface et traductions, tests écrits
  contre un contrat explicite, ajustement de style) ; aucun critère
  « complexe » n'est vrai.
- **`standard`** dans tous les autres cas.

**Montée de palier.** Après un verdict `fail`, l'itération suivante monte d'un
palier (cf. Phase 2, d.). Une étape classée `simple` à tort ne coûte ainsi
qu'une itération Sonnet avant de repartir sur Opus. La limite de 3 itérations
par étape est inchangée.

**Suivi.** Le journal consigne, par étape, le palier de départ et son origine
(marqueur ou proposition), le palier final, le modèle de chaque itération et
les `subagent_tokens` de chaque appel. Ce suivi permettra d'ajuster la grille :
le benchmark ne mesure qu'une tâche d'un seul fichier.

## Suivi d'exécution publié

L'avancement d'une exécution est **publié au fil de l'eau** par l'outil
`tools/history/run-tracker.mjs` (Node, sans dépendance), que l'orchestrateur
appelle à chaque transition. Aucun agent n'est dédié au suivi et les subagents
n'y écrivent jamais. Chaque exécution (« run ») a deux fichiers sous
`documentation/history/executions/.etat/` (ignoré par git, propre au checkout
où tourne l'exécution) :

- `<runId>.events.jsonl` — journal d'événements en ajout seul, qui fait foi ;
- `<runId>.state.json` — instantané dérivé, réécrit à chaque événement.

Le `runId` (`YYYY-MM-DD_HH-mm_exec_<slug>`) est aussi le nom du journal
d'exécution écrit en clôture. Contrat complet, schémas et exemples :
[`tools/history/README.md`](../../../tools/history/README.md).

Ce suivi sert d'abord le workflow : il permet la
[reprise](#reprise-dune-exécution), il survit à une compaction du contexte de
la session, il donne au `documenter` des faits enregistrés plutôt qu'une
mémoire, et il répond à « où en est ce plan ? » sans IA (`status`, `list`).

**Trois espaces de statuts, jamais confondus** :

| Espace | Valeurs | Qui le fixe |
|---|---|---|
| Plan (`plan.status`) | `plan`, `ready-to-execute`, `executing`, `done` | le frontmatter ; l'outil refuse de consigner un statut que le fichier ne porte pas |
| Rapport implementer | `success`, `partial`, `blocked` | l'implementer ; un `success` ne valide pas l'étape |
| Verdict verifier | `pass`, `pass-with-notes`, `fail` | le verifier, par itération ; gate final à part |

S'y ajoutent l'état du run (`running`, `waiting-user`, `interrupted`, `closed`
avec son issue `completed` / `escalated` / `aborted`) et l'état de chaque étape
(`pending`, `in-progress`, `waiting-user`, `done`, `skipped`, `escalated`).

**Fichier d'ouverture** (`init --from`) — écrit avec l'outil `Write`, supprimé
par l'outil après lecture :

```json
{
  "plan": "documentation/history/tasks/<artefact>.md",
  "profile": "auto",
  "isolation": "none",
  "repos": { "integration": "/chemin/absolu/du/depot-cible" },
  "steps": [
    { "id": "1", "tag": "backend", "title": "Titre court", "complexity": "standard" },
    { "id": "2.a", "tag": "backend+frontend", "role": "backend", "title": "Titre court" },
    { "id": "2.b", "tag": "backend+frontend", "role": "frontend", "title": "Titre court" },
    { "id": "3", "tag": "decision", "title": "Titre court" },
    { "id": "4", "tag": "station", "repo": "integration", "title": "Contrat partagé" }
  ]
}
```

`steps` est la **liste d'exécution** de la Phase 1 (étapes 3 à 5 bis) : les
identifiants sont ceux du plan, tels quels (`0`, `1b`, `16a`, `29.1`) ; une
étape à tag composé y figure par ses sous-étapes `N.a`, `N.b`, chacune avec
son `role`. `plan` reçoit le chemin donné à la skill : l'outil applique la même
résolution mono / découpé que la Phase 1.0 et lit `slug`, `title`, `kind` et
`status` dans le frontmatter. `repo` est explicite pour chaque étape extérieure ;
sans ce champ, elle appartient à `project`. `repos` ne liste que les dépôts externes
visés par une étape ; l'outil relève la branche et le commit de départ de
chacun.

**Commandes** — toutes sous la forme `node tools/history/run-tracker.mjs
<commande> …`, depuis la racine du checkout d'exécution. `--run <runId>` est
facultatif tant qu'un seul run est ouvert dans le checkout. Chaque commande
répond par une ligne `ok …` ; une ligne `warn:` signale une anomalie de
séquence sans bloquer ; une `erreur:` (sortie `2`) n'écrit rien.

| Moment | Commande |
|---|---|
| Ouverture (Phase 1, étape 9) | `init --from <fichier>` puis `plan-status --to executing` |
| Avant un appel `Agent` | `launch --role <implementer, verifier ou documenter> --agent <subagent_type> [--step <n>] [--mode <step, docs-config ou final>] [--tier <palier>]` |
| L'appel `Agent` échoue sans rapport | `launch-failed --role <rôle> [--step <n>] --error "<erreur>"` |
| Rapport implementer | `report --step <n> --status <success, partial ou blocked> [--files a,b] [--tokens <n>] [--note "…"]` |
| Rapport verifier | `report --step <n> --mode <step ou docs-config> --verdict <pass, pass-with-notes ou fail> [--action <recommendedAction>] [--blocking <n>] [--notes <n>] [--note "…"]` |
| Rapport du gate final | `report --mode final --verdict <verdict>` |
| Attente utilisateur | `wait [--step <n>] --reason <raison> [--note "…"]` — raisons : `decision`, `manual`, `escalation`, `implementer-blocked`, `non-conformant-report`, `launch-failure`, `final-gate-fail`, `classification`, `other` |
| Réponse de l'utilisateur | `resolve [--step <n>] --action <continue, retry, done, skip ou abort> [--note "…"]` |
| Étape close sans attente (skip en mode dégradé…) | `close-step --step <n> --outcome <done, skipped ou escalated> [--note "…"]` |
| Étape ajoutée en cours d'exécution | `add-step --id <n> --tag <tag> --title "…" [--after <n>]` |
| Changement de profil | `profile --to <profil> --reason "…"` |
| Interruption | `interrupt --reason "<cause>" [--note "…"]` |
| Reprise | `resume` |
| Journal écrit | `report --role documenter --status ok --journal <chemin>` |
| Clôture du run | `close --outcome <completed, escalated ou aborted>` |
| `done` confirmé / refusé | `plan-status --to done` / `plan-status --done-declined` |
| Consultation | `status` · `list` |

Règles de publication :

- **Au moment du fait**, pas après coup : le lancement se publie dans le même
  message que l'appel `Agent` ; le rapport dès son retour, avant de lancer
  l'agent suivant (les deux commandes peuvent partager un même appel shell).
- **L'itération n'est jamais passée à la main** : chaque `launch --role
  implementer` ouvre l'itération suivante de l'étape. Relancer le `verifier`
  seul (détour `environnement`) ne compte pas d'itération.
- **Effets automatiques**, à ne pas doubler : un verdict `pass` /
  `pass-with-notes` clôt l'étape ; un rapport `blocked`, un `launch-failed`, un
  verdict `fail` avec `--action escalate-to-user` et un gate final `fail`
  mettent en attente utilisateur ; tout `launch` ou `resolve` lève l'attente.
- **Un échec de publication n'arrête pas l'exécution** : corriger la commande
  d'après le message d'erreur, sinon continuer et le signaler dans le récap.
- Les notes restent courtes (une phrase) : le détail va au journal.

## Reprise d'une exécution

Une exécution s'interrompt par choix (mode dégradé, demande de l'utilisateur :
`interrupt`) ou par accident (session perdue, sans événement). Dans les deux
cas le plan reste `executing` et le run reste ouvert.

À l'entrée de la skill sur un plan `executing`, ou avec `--reprendre` :

1. Lancer `node tools/history/run-tracker.mjs list`. S'il existe un run ouvert
   pour ce plan, afficher `status --run <runId>` à l'utilisateur. S'il n'en
   existe aucun (exécution antérieure au suivi, ou menée dans un autre
   checkout — l'état est propre à chaque checkout et worktree), le dire et
   demander : repartir d'une liste d'étapes restantes fournie par
   l'utilisateur (nouveau run par `init`, étapes déjà faites closes par
   `close-step --outcome done --by user`), ou abandonner.
2. Faire confirmer la reprise, puis `resume`. L'outil rouvre le run (compteur
   de session incrémenté), remet à `pending` l'étape qui était en cours — elle
   repart **en itération 1** — et garde closes les étapes faites, ignorées ou
   escaladées. Il avertit si `HEAD` ne descend plus du commit de départ.
3. Reprendre le **profil consigné** (`run.profile`), sauf demande contraire
   (alors `profile --to <profil>`).
4. Vérifier l'arbre de travail avant de relancer l'étape : une étape
   interrompue peut avoir laissé des fichiers modifiés. Les montrer à
   l'utilisateur ; le nouvel implementer reçoit l'instruction de reprendre
   l'état laissé.
5. Reconstituer la mémoire d'exécution depuis l'instantané (étapes closes,
   verdicts, fichiers, notes), relire les sections 4, 5, 8 et 9 du plan, puis
   entrer en Phase 2 à `progress.next`.

## Schéma rapport implementer → orchestrateur

Le rapport conserve `status: success | partial | blocked`, `iteration`, les
sections Résumé, Fichiers touchés, Points d'attention, Vérifications lancées
et Questions ouvertes. Modèle :
[contrat commun d'implémentation](../../agents/references/implementation.md#rapport-vers-lorchestrateur).
Les catégories lint/typecheck/test/build sont renseignées selon leur pertinence,
avec les commandes réelles et leur checkout. `success` requiert les contrôles
obligatoires réussis ; un élément requis non vérifié donne `partial` ou `blocked`.
L'UI ajoute Fidélité maquette (référence et écarts, ou n/a).

## Schéma rapport verifier → orchestrateur

Le rapport conserve `mode: docs-config | step | final`,
`verdict: pass | pass-with-notes | fail`,
`recommendedAction: merge | fix-and-reverify | escalate-to-user`,
Checks lancés, Items bloquants et Items non-bloquants. Le détail et les Limites
de vérification sont définis dans
[le contrat du vérificateur](../../agents/verifier.md#rapport-obligatoire).
Chaque finding porte le cas concret, sa conséquence et le correctif minimal.
Les checks dépendent du projet ; l'absence d'un contrôle requis reste visible.

## Critères bloquant vs non-bloquant

Appliquer la grille de gravité de
[`verifier.md`](../../agents/verifier.md#gravité-et-verdict), pour tous les
modes et rôles. Un bug démontré, un appelant cassé, un défaut de sécurité ou de
données, un échec à la charge attendue, une règle obligatoire violée ou un
contrôle requis rouge/impossible est bloquant. Une amélioration démontrée de
simplicité, de tests ou de performance peut être non bloquante si les critères
sont satisfaits. Les préférences personnelles de nommage/style ne sont pas
publiées comme constats. Aucune grille métier parallèle n'est embarquée ici.

## Politique de troncature du contexte transmis

Pour éviter de gonfler les prompts subagent :

- Étape n-1 : rapports implementer **et** verifier intégraux.
- Étapes antérieures (n-2 et au-delà) : résumé 1 ligne par étape extrait du
  journal d'exécution (titre, verdict, fichiers principaux touchés).
- Étapes `[decision]` antérieures : décision intégrale, toujours.
- Sections 4, 5, 8, 9 de l'artefact de plan : toujours intégrales.

## Mode dégradé

Si un subagent n'est pas disponible (fichier `.claude/agents/<role>.md`
manquant) : signaler à l'utilisateur et proposer soit (a) que la session
principale exécute l'étape elle-même (perd l'isolement), soit (b) skip de
l'étape avec consignation dans le journal.

**Variante de profil manquante** : si le profil retenu requiert une variante
absente (`backend-implementer-opus-*`, `frontend-implementer-opus-*` ou
`verifier-opus-*`), prévenir l'utilisateur et proposer le fallback **profil
`herite` pour le seul rôle concerné** (agent de base + inherit, sans
`model` / `effort` injecté), avec consignation au journal ; les autres rôles
conservent le profil choisi. Exemple : en profil `opus-4-6`, si
`verifier-opus-4-6` manque, le verifier retombe sur `verifier` (inherit) tandis
que les implementers restent en `*-opus-4-6`. **Ne jamais substituer une autre
génération en silence** — l'intérêt de l'axe `opus-*` est justement que le
journal reflète la génération réellement utilisée.

**Modèle refusé au dispatch** : la variante existe, mais l'appel `Agent`
échoue parce que le modèle de son frontmatter n'est pas utilisable. Cas
typiques : la version de Claude Code qui porte la session est trop ancienne
(Opus 5.5 exige **Claude Code ≥ 2.1.280**), ou le modèle n'est pas servi. Ce
cas concerne un implementer, le verifier ou le gate final.
**Interrompre** alors la boucle, sans relance automatique et sans repli
silencieux, puis poser via `AskUserQuestion` une question à choix multiple :

- **Dégrader le modèle** — basculer **toute la suite de l'exécution** sur le
  profil de repli : `opus-4-8` si le profil refusé est `opus-5-5`,
  `opus-5-5-medium` ou `opus-5`, `opus-5-5-medium` si le profil refusé est
  `sonnet-5-5`, `herite` si le profil refusé est déjà `opus-4-8`. Sous le
  profil `auto`, si seul Sonnet 5.5 est refusé, les étapes `simple` passent en
  `standard` et le reste du routage est conservé ; si Opus 5.5 est refusé, toute
  la suite bascule sur `opus-4-8`. Tous les rôles
  basculent ensemble, pour que les étapes restantes restent comparables
  entre elles. La question n'est pas reposée à chaque étape. L'étape en cours
  est relancée depuis son début (itération 1) sous le profil de repli.
- **Interrompre l'exécution** — arrêter proprement à l'étape en cours. Le plan
  reste en `status: executing`. Publier `interrupt --reason model-refused
  --note "<remède>"` : le run reste ouvert et sera repris (cf.
  [Reprise d'une exécution](#reprise-dune-exécution)). **Ne pas** invoquer le
  `documenter` : le journal n'est écrit qu'à la clôture, l'état interrompu vit
  dans le suivi. L'utilisateur peut mettre à jour Claude Code, relancer sa
  session, puis reprendre le plan.

Au suivi, l'échec du dispatch se publie d'abord par `launch-failed` (le run
passe en attente utilisateur). Le choix **Dégrader** se publie par `profile --to
<profil de repli> --reason "<erreur>"` puis `resolve --step <n> --action retry`
(l'étape repart en itération 1).

Le message de la question cite l'erreur renvoyée, le profil et le rôle
concernés, ainsi que le remède (mettre à jour l'app desktop, ou `npm install
-g @anthropic-ai/claude-code@latest` pour la CLI, puis relancer la session :
une session ouverte garde la version de Claude Code de son démarrage).
En contexte **non interactif**, où `AskUserQuestion` ne peut s'afficher,
appliquer **Interrompre** : ne jamais dégrader sans accord. Dans les deux cas,
consigner au journal le profil demandé, le profil effectivement utilisé (et à
partir de quelle étape), ainsi que l'erreur d'origine.

Si la skill `plan-history-artifact-writer` a été modifiée et que le format des
tags `[role]` n'est plus reconnu : tomber sur l'inférence assistée par
l'utilisateur (Phase 1 étape 3 alternative).

## Sortie

À la fin d'une exécution réussie, l'orchestrateur produit dans la conversation :

- le **profil d'exécution** retenu (`auto` / `herite` / `opus-4-6` / `opus-4-8` /
  `opus-5` / `opus-5-5` / `opus-5-5-medium` / `sonnet-5-5` / `sonnet`) et tout fallback de variante éventuellement appliqué ;
- ligne par étape : `[role] étape n° — verdict` ; sous le profil `auto`,
  ajouter le palier (et sa montée éventuelle, par exemple `simple → standard`)
  et le total de tokens de l'étape ;
- chemin du journal d'exécution (`documentation/history/executions/<runId>.md`)
  et `runId` du suivi ;
- suggestion de message de commit (Conventional Commit en français, scope
  dérivé des sections touchées) — **non exécutée**.

## Articulation avec les autres skills

- `plan-history-artifact-writer` fournit les plans à exécuter.
- Les règles d'architecture, de domaine et d'UI sont celles du projet cible ;
  ses skills existantes et applicables sont transmises dans le contexte.
- Les outils de recherche, de revue et de preview disponibles peuvent aider
  le vérificateur, sans remplacer ses preuves ni imposer une intégration.
