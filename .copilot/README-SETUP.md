# Template Setup

This template is designed for the following workflow:

```bash
npm create vite@latest .
npx degit huntermasur/vite-template . --force
```

Then commit and push.

---

## What Gets Added

```
.github/copilot-instructions.md   ← agent coding conventions
.copilot/
  project-brief.md                ← fill this out before starting
  initial-prompt.md               ← paste to agent to kick off a project
  prompts/                        ← reusable Copilot Chat slash commands
  references/                     ← diagrams, mockups, docs for the agent
.vscode/
  settings.json                   ← format on save, ESLint, file nesting
  extensions.json                 ← recommended extension prompt on open
.gitignore                        ← Vite/Node standard
.editorconfig                     ← consistent indent/line endings
README.md                         ← replaces Vite's default
```

> `--force` will overwrite any files Vite scaffolded with the same name, including `README.md` and `.gitignore`. This is intentional.

---

## After Degit

1. Fill out `.copilot/project-brief.md` — this is what the agent reads before doing anything
2. Download any skills you need from skills.sh
3. Populate `.copilot/references` - this is all of the detail you are passing to the agent
4. Paste `.copilot/initial-prompt.md` as your first Copilot Chat message to kick off development
5. Accept the recommended extensions prompt VS Code shows on first open
