---
agent: agent
description: Scaffold a typed React component with a co-located test file
---

# Create Component

Create a new React component following the project conventions.

## Steps

1. Ask for the component name, which feature it belongs to (or `shared`), and its purpose in one sentence.
2. Confirm the output path before writing:
   - Feature component: `src/features/<feature>/components/<component-name>.tsx`
   - Shared component: `src/shared/components/<component-name>.tsx`
3. Create `<component-name>.tsx`:
   - Functional component with typed props interface exported separately
   - PascalCase component name, kebab-case filename
   - Use semantic HTML; add `aria-label` to any interactive element without visible text
   - Handle loading, error, and empty states where relevant
4. Create `<component-name>.test.tsx` co-located beside the component:
   - Use Vitest + React Testing Library
   - Cover: renders without crashing, key user interactions, edge cases
   - Test names should read as documentation (e.g. `it('shows error message when fetch fails')`)
5. If the component requires new types, add them to the nearest `types.ts` file.
6. If the component needs to be exported from a feature's public API, add it to the feature's `index.ts`.

## Constraints

- No inline styles — use CSS modules or Tailwind classes
- No `any` types
- Props must have defaults or be explicitly required
- No direct API calls in the component — use a hook instead
