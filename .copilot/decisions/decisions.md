# Architectural Decisions

Locked-in decisions the agent should apply without question.
Do not relitigate these unless there is a genuine blocking reason — if something needs reconsidering, add a new entry rather than editing the old one.

Use the format below. Status options: **Accepted** | **Superseded** | **Deprecated**

---

## Template entries

> Replace these with real decisions as you make them. A few examples are pre-filled because they come with the template.

---

### ADR-001 — Vite as the build tool

|                |          |
| -------------- | -------- |
| **Status**     | Accepted |
| **Date**       | —        |
| **Supersedes** | —        |

**Context**  
The project needs a fast local dev server and a production bundler for a modern frontend.

**Decision**  
Use [Vite](https://vitejs.dev/) as the build tool and dev server.

**Rationale**

- Near-instant HMR via native ESM — dramatically faster than webpack-based tools
- First-class TypeScript and JSX support with zero config
- Active ecosystem; well-supported by framework plugins (React, Vue, Svelte)
- Rollup under the hood for production builds — predictable and well-understood output

**Consequences**

- All imports must be ES module compatible (no CommonJS-only packages without a shim)
- Environment variables are prefixed with `VITE_` to be exposed to the client

---

### ADR-002 — TypeScript everywhere

|                |          |
| -------------- | -------- |
| **Status**     | Accepted |
| **Date**       | —        |
| **Supersedes** | —        |

**Context**  
The project will grow over time. Type safety helps catch bugs early and makes refactoring safer.

**Decision**  
All source files under `src/` must be TypeScript (`.ts` / `.tsx`). No plain `.js` files.

**Rationale**

- Catches entire classes of bugs at compile time rather than runtime
- Enables accurate autocomplete and refactoring tooling
- Documents intent — types act as inline documentation for function contracts

**Consequences**

- Team members must be comfortable with TypeScript basics
- Third-party packages without type definitions need `@types/*` packages or manual declarations
- `any` is disallowed (see `constraints.md`) — use `unknown` with narrowing

---

### ADR-003 — Feature-based folder structure

|                |          |
| -------------- | -------- |
| **Status**     | Accepted |
| **Date**       | —        |
| **Supersedes** | —        |

**Context**  
As the application grows, a flat component or layer-based structure becomes hard to navigate.

**Decision**  
Organise source code by feature under `src/features/`, with shared code in `src/shared/`, route components in `src/pages/`, and root setup in `src/app/`.

**Rationale**

- Co-locations make it obvious what files belong together
- Feature boundaries enforce encapsulation — internals stay private, public API is explicit via `index.ts`
- Easier to delete or extract a feature without hunting across the tree

**Consequences**

- New features must be added as a folder under `src/features/`, not inlined into pages
- Cross-feature imports should go through each feature's `index.ts`, not into internals

---

### ADR-004 — _[Your decision title]_

|                |          |
| -------------- | -------- |
| **Status**     | Accepted |
| **Date**       | —        |
| **Supersedes** | —        |

**Context**  
_Describe the situation or problem that forced a decision._

**Decision**  
_State the decision clearly in one or two sentences._

**Rationale**

- _Why this option over the alternatives?_

**Consequences**

- _What does this mean for the codebase going forward?_
