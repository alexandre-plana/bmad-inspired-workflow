# Journaux d'exécution

Le documentaliste écrit un journal `<runId>.md` en une seule passe à la clôture. L'orchestrateur conserve l'avancement en cours via `tools/history/run-tracker.mjs`, sous `.etat/`.

Les journaux ne sont pas indexés comme les plans. Les fichiers de `.etat/` sont locaux et ignorés par Git.
