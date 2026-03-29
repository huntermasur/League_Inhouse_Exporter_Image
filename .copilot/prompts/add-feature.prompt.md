---
agent: agent
description: Scaffold a complete feature end-to-end (types → hook → component → tests)
---

# Add Feature

Build a new feature end-to-end following the project's feature-based folder structure.

## Steps

1. Ask for:
   - Feature name (e.g. `auth`, `dashboard`, `products`)
   - Brief description of what it does
   - Any known external APIs or data sources it touches
2. Propose the file structure and wait for approval before writing:
   ```
   src/features/<feature>/
     components/       ← UI for this feature
     hooks/            ← data-fetching and logic hooks
     types.ts          ← all types for this feature
     index.ts          ← public API — only export what other features need
   ```
3. **types.ts first** — define all entities, request/response shapes, and state types
4. **Hook(s) next** — data fetching, mutations, or local state logic; return typed `{ data, error, isLoading }` shapes
5. **Component(s) last** — consume the hook; handle loading, error, and empty states explicitly
6. **Tests alongside each file**:
   - `hooks/<hook-name>.test.ts` — mock the data layer, test state transitions
   - `components/<component-name>.test.tsx` — render with mock hook output, test user interactions
7. Export the public API through `index.ts` — keep implementation details private

## Constraints

- No cross-feature imports except through a feature's `index.ts`
- No `any` types; use `unknown` + type narrowing when shape is uncertain
- All async operations must handle errors — never leave a promise unhandled
- Accessibility baseline: semantic elements, keyboard-navigable, aria-labels where needed
