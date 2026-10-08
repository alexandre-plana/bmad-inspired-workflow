# Intégration complète de Ponytail 5.0 — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Exécution dans cette session ; évaluation indépendante des contrats avant publication.

**Goal:** Réutiliser la distribution officielle complète et raccorder audit/debt au workflow sans perdre l'analyse du besoin.

**Architecture:** Les sources upstream restent inchangées sous `third_party/ponytail/`. Un adaptateur local charge les outils demandés depuis `planningRoot`. Le brief conserve l'autorité sur le périmètre ; les hooks restent une option d'installation explicite.

**Tech Stack:** Markdown, Git, Node.js sans dépendance pour les contrôles locaux.

**Spec:** Proposition approuvée dans la conversation : analyse-need → audit conditionnel → plan → implémentation/review → dette → journal. Distribution complète épinglée ; help/gain à la demande ; pas d'activation globale implicite.

## Global Constraints

- Ponytail `v5.0.0`, commit `b088b2df6e08d4306c6a3c3d575fe38c2d2d2989`, fichiers upstream identiques octet pour octet, licence préservée.
- Conserver le dialogue et le brief de `analyse-need` ; aucun audit global systématique pour les petits fixes.
- Les constats d'audit ne deviennent des travaux que dans le périmètre accepté. Un changement du besoin impose un arbitrage avant exécution.
- Le bilan de dette ne remplace aucun contrôle requis ; seuls les commentaires marqués sont inventoriés.
- Conserver le schéma du tracker et l'écriture unique du journal. Les outils de consultation ne modifient aucune configuration utilisateur.

## Review Focus

Sources absentes ; brief non validé ou dépassé ; audit hors périmètre ; dette multi-checkouts après reprise ; zéro marqueur interprété abusivement comme zéro dette.

## Task 1 — Distribution officielle et intégrité

**Files:** `third_party/ponytail/**`, `tools/ponytail/vendor.test.mjs`.

**Interfaces:** Conserve les chemins des sources existantes ; ajoute les quatre skills, hooks et tous les autres fichiers upstream. Le lock fournit chemins, modes, SHA-256, blobs et arbre Git.

- [x] Étendre le contrôle à l'arbre officiel complet ; observer son échec avec l'import partiel.
- [x] Importer les 199 fichiers du commit sans son historique Git et vérifier l'arbre et chaque blob.
- [x] Relancer les tests d'intégrité.

## Task 2 — Routage du besoin, de l'audit et de la dette

**Files:** `.claude/skills/ponytail-tools/SKILL.md`, `analyse-need/SKILL.md`, `plan-history-artifact-writer/SKILL.md`, `execute-plan/SKILL.md`, `.claude/agents/documenter.md`.

**Interfaces:** Audit transmis comme pièce de contexte au writer ; bilan debt transmis par l'orchestrateur au documentaliste dans le récap de clôture, sans nouveaux champs du tracker.

- [x] Évaluer les scénarios F–M avant modification et relever les manques de contrat.
- [x] Ajouter le chargement des sources originales et les conditions de passage ; conserver la méthode upstream.
- [x] Évaluer les mêmes scénarios après modification et corriger les contradictions démontrées.

## Task 3 — Portage, provenance et publication

**Files:** README, NOTICE, docs de portage/intégration/provenance, évaluations, manifeste d'extraction.

- [x] Documenter le parcours et l'option hooks, avec les sources officielles disponibles.
- [x] Recalculer les empreintes locales ; vérifier liens, frontmatter et absence du nom interdit dans les fichiers et l'historique accessible.
- [ ] Exécuter les tests du tracker et d'intégrité, contrôler le diff, committer puis pousser `main` vers le dépôt dédié ; confirmer le SHA distant.

Validation : 23 tests locaux passés ; 199 blobs et arbre officiel vérifiés ; 75 liens Markdown et absence du nom interdit contrôlés. Évaluation indépendante F–M conforme au contrat, sans exécution applicative. Les défauts de whitespace des sources upstream sont conservés ; le contrôle de whitespace porte sur les fichiers locaux. La publication et son SHA distant sont confirmés dans le compte rendu de livraison.
