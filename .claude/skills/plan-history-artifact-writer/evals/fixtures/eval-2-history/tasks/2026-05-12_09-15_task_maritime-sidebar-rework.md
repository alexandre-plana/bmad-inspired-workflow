---
type: planning-artifact
kind: task
status: planned
createdAt: "2026-05-12T09:15:00+02:00"
source: claude-plan-mode
historyRelation: new
title: "Maritime sidebar rework"
slug: "maritime-sidebar-rework"
relatedTaskId: null
relatedFindingId: null
relatedIssueId: null
repositoryAreas:
  - "frontend/src/components/maritime/MaritimeSidebar.tsx"
tags:
  - "maritime"
  - "sidebar"
  - "ui"
---

# Maritime sidebar rework

## 1. Prior history check

`documentation/history/index.jsonl` was consulted. No relevant prior planning
history found.

## 2. Context

The maritime mission sidebar is a single long scrolling column that mixes the
contact list, mission status, and operator controls. Operators lose track of
the active mission state when the contact list grows.

## 3. Objective

Restructure `MaritimeSidebar.tsx` into three collapsible sections: Contacts,
Mission status, and Controls.

## 4. Scope

- Section components and collapse state for the sidebar.
- Persisting collapse state per section in component state.

## 5. Out of scope

- The tactical map.
- Contact data fetching and the socket layer.

## 6. Proposed plan

1. Introduce a `CollapsibleSection` wrapper component.
2. Move the contact list, mission status, and controls into three sections.
3. Track collapsed state per section.

## 7. Decisions

| Decision | Rationale | Alternatives considered | Impact |
|---|---|---|---|
| Local component state for collapse | Sidebar is self-contained; no cross-page need | Global store | Low |

## 8. Expected repository changes

```
frontend/src/components/maritime/MaritimeSidebar.tsx — split into sections
```

## 9. Validation strategy

Typecheck and manual UI verification of the three collapsible sections.

## 10. Acceptance criteria

- [ ] Sidebar shows three collapsible sections.
- [ ] Collapse state works per section.

## 11. Risks and precautions

Layout regressions on narrow viewports.

## 12. Open questions

> No blocking open question identified.

## 13. Execution handoff

### Objective

Split the maritime sidebar into three collapsible sections.

### Files to inspect first

- `frontend/src/components/maritime/MaritimeSidebar.tsx`

### Files likely to modify

- `frontend/src/components/maritime/MaritimeSidebar.tsx` — split into sections

### Implementation steps

1. Add a `CollapsibleSection` component.
2. Wrap the three content blocks.
3. Verify layout.

### Do not change

- The tactical map.
- The socket layer.

### Expected result

The maritime sidebar renders three independently collapsible sections.
