# Constraints

Hard limits the agent must never violate. These are non-negotiable across the entire project.
When you start a new project, replace the examples below with real entries and delete placeholders that don't apply.

---

## Timeline

<!--
  Examples:
  - MVP must ship by 2026-06-01
  - No time budget for exploratory refactors before v1 is live
-->

- [ ] _Add deadline / phase milestones here_

---

## Budget & Effort

<!--
  Examples:
  - Side project — no paid third-party services unless free tier covers all usage
  - No specialist infrastructure (e.g. no GPU instances, no dedicated servers)
-->

- [ ] _Add budget or resource constraints here_

---

## Technology

<!--
  Hard rules about what can or cannot be used, regardless of what might be "better".
  Examples:
  - Must use TypeScript; plain JavaScript is not permitted
  - React only — no Vue, Svelte, or other UI frameworks
  - No jQuery or class-based components in new code
  - Must target Node 20 LTS; no Node 22+ APIs
  - No paid npm packages without prior approval
-->

- Must use TypeScript — no plain `.js` files in `src/`
- [ ] _Add further tech constraints here_

---

## Security

<!--
  Examples:
  - No secrets in source code or environment files committed to the repo
  - All user input must be validated and sanitised before use
  - No `eval`, `Function()`, or dynamic `import()` with user-supplied strings
  - Authentication must use industry-standard flows (OAuth 2.0 / OIDC); no hand-rolled auth
-->

- No secrets, API keys, or credentials committed to version control — use `.env` (gitignored) and a secrets manager
- All user-supplied data must be validated at system boundaries before use
- [ ] _Add further security constraints here_

---

## Accessibility

<!--
  Examples:
  - Must meet WCAG 2.1 AA
  - All interactive elements must be keyboard-navigable
  - No colour-only information cues
-->

- Must meet WCAG 2.1 AA as a minimum
- [ ] _Add further accessibility constraints here_

---

## Browser & Platform Support

<!--
  Examples:
  - Support last 2 versions of Chrome, Firefox, Safari, and Edge
  - No IE11 support required
  - Mobile-first; must be fully usable on 375px viewport width
-->

- [ ] _Define target browsers and minimum viewport width_

---

## Code Quality

<!--
  Examples:
  - No `any` types in TypeScript
  - All async errors must be explicitly handled — no unhandled promise rejections
  - No `console.log` in committed code (use a proper logger or remove before PR)
  - Test coverage must not drop below 80% on new code
-->

- No `any` types — use `unknown` with proper narrowing where dynamic types are needed
- No silent `catch` blocks — errors must be handled or re-thrown
- [ ] _Add further code quality rules here_

---

## Architecture

<!--
  Examples:
  - All API communication must go through a dedicated service layer (no fetch calls in components)
  - No circular dependencies between features
  - Feature internals are private; public API exposed only through index.ts
-->

- Feature internals are private; export through `index.ts` only
- [ ] _Add further architecture constraints here_
