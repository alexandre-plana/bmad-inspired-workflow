# Modèle de tâche

Avant de composer, établir uniquement ce qui influence la structure.

| Champ | Question |
|---|---|
| User | Qui agit ? novice, expert, opérateur, manager, client ? |
| Context | Appareil, environnement, urgence, fréquence, distance de lecture ? |
| Primary task | Quel résultat veut-il obtenir ? |
| Decision | Que doit-il comprendre/comparer avant d'agir ? |
| Success | Quel état observable signifie « terminé » ? |
| Frequency | Action occasionnelle ou répétitive ? |
| Risk | Conséquence et réversibilité ? |
| Parent context | Faut-il conserver la page mère visible ? Sans objet si le conteneur est une tuile de premier rang. |

Format (clés en anglais comme identifiants stables, contenu dans la langue du projet) :

```text
User:
Context:
Primary task:
Decision needed:
Success:
Frequency:
Risk / reversibility:
Parent context needed:
```

## Discipline

- Distinguer **exigence**, **information fournie** et **hypothèse**.
- Ne pas inventer une persona détaillée sans données.
- Une tâche primaire doit pouvoir être formulée par un verbe et un résultat.
- S'il existe plusieurs tâches réellement primaires, vérifier si l'écran ne devrait pas être séparé en vues ou modes distincts.
