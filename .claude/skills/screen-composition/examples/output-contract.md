# Exemple de sortie

```text
PRIMARY TASK
Permettre à l'opérateur de vérifier un objet sélectionné et de modifier
quelques attributs sans perdre le contexte parent.

SUCCESS / DECISION
Décider si l'objet est suffisamment fiable avant modification.

PROJECT CONSTRAINTS
Le projet impose son design system et ses règles métier ; aucun choix
de composant concret n'est fait ici. Conteneur imposé : tuile du
workspace (le choix de surface ne porte que sur l'intérieur).

INFORMATION PRIORITY
P0 — identité, statut, fraîcheur, niveau de confiance
P1 — données qui expliquent la décision
P2 — historique récent
P3 — métadonnées techniques

SURFACE + RATIONALE
Conteneur : tuile imposée par le shell.
Intérieur : détail inline non modal, la tâche est secondaire et le
contexte parent reste nécessaire.

READING ORDER
1. identité + état
2. données P0/P1
3. contrôles d'édition
4. historique / détails

ACTIONS
Primary — Enregistrer les modifications
Secondary — Annuler
Destructive — aucune

DATA DISPLAY
Valeurs exactes → readouts/table
Historique temporel → line chart uniquement si la tendance influence la décision

STATES
loading, stale/partial, error, success

ACCESSIBILITY / RESPONSIVE / DISTANCE
focus logique ; détail utilisable au clavier ; petit écran → détail pleine
largeur sous la liste ; lecture à distance → liste et état seuls, détail inerte

WIREFRAME
[header]
[identity + status]
[decision data]
[controls]
[secondary details]
[footer: cancel | primary]

ASSUMPTIONS / RISKS
1. L'édition ne nécessite pas un workflow multi-étape.
2. Le contexte parent doit rester consultable.

GAPS TO ARBITRATE
G1 — maquette ↔ backend : la maquette affiche « essai 3 sur 6 » ; le
backend n'expose ni plafond ni compteur d'essais → dériver la consigne
d'une durée de perte, ou exposer le compteur (décision utilisateur avant
le code).
G2 — reco générique ↔ contrainte projet : la fraîcheur est classée P0 par
doctrine projet alors que le test de valeur générique la classerait P2 →
P0 retenu, cession consignée.
```
