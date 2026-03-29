---
agent: agent
description: Perform a checklist-driven code review on a file or feature
---

# Code Review

Review the target file or feature against the project's quality standards.

## Steps

1. Ask which file or feature to review, then read all relevant source files before commenting.
2. Work through the checklist below and report findings grouped by category.
3. For each issue: state the file + line, explain _why_ it's a problem, and suggest a concrete fix.
4. Distinguish severity:
   - **Must fix** — bug, security issue, or violation of project conventions
   - **Should fix** — code smell, maintainability concern, or missing test coverage
   - **Consider** — style preference, alternative approach worth knowing about

## Review Checklist

### Types & Safety

- [ ] No `any` types; `unknown` used with proper narrowing where needed
- [ ] All function parameters and return values are typed
- [ ] Optional chaining and nullish coalescing used where values may be absent

### Error Handling

- [ ] No silent `catch` blocks
- [ ] All async paths handle errors and surface them to the user or caller
- [ ] Error states are represented in the UI (not just logged)

### React & Hooks

- [ ] No direct mutations of state
- [ ] `useEffect` dependencies are complete and accurate
- [ ] No derived state stored in `useState` when it can be computed
- [ ] Props are destructured with types; no prop drilling past 2 levels

### Accessibility

- [ ] Semantic HTML elements used (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] All interactive elements have accessible text or `aria-label`
- [ ] Focus management is correct for modals and dynamic content

### Performance

- [ ] No unnecessary re-renders caused by unstable references (inline objects/functions in JSX)
- [ ] Expensive computations wrapped in `useMemo`; callbacks in `useCallback` where passed as props
- [ ] Large lists use virtualization if >100 items

### Testing

- [ ] New logic is covered by unit tests
- [ ] Tests are testing behavior, not implementation details
- [ ] Edge cases (empty, null, error) are covered

### Conventions

- [ ] Naming follows project conventions (PascalCase components, kebab-case files, etc.)
- [ ] Feature internals are not imported by other features directly (only via `index.ts`)
- [ ] Commit messages follow Conventional Commits format
