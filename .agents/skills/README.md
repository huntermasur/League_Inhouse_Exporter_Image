# Skills

Place VS Code agent skill files here. Skills are reusable instruction sets the agent can load on demand — they give Copilot deep, domain-specific knowledge about a particular task without bloating your main `copilot-instructions.md`.

## What is a skill?

A skill is a Markdown file (`.skill.md`) with a YAML frontmatter block that describes when the agent should use it. When Copilot detects a task that matches a skill's description, it reads the skill file and follows its instructions automatically.

```yaml
---
name: my-skill-name
description: What this skill does and when it should be invoked (1-2 sentences)
---
```

The body of the file contains the actual instructions — step-by-step guidance, checklists, templates, or domain context the agent should apply.

## What belongs here

- **Workflow skills** — multi-step procedures the agent follows for recurring tasks
  - e.g. `create-feature.skill.md`, `write-migration.skill.md`, `release.skill.md`
- **Domain knowledge skills** — context about a specific part of the system
  - e.g. `api-conventions.skill.md`, `auth-flow.skill.md`, `design-system.skill.md`
- **Checklist skills** — quality gates the agent runs before completing a task
  - e.g. `pre-commit-checklist.skill.md`, `accessibility-audit.skill.md`

## Naming conventions

| Pattern                          | Example                     |
| -------------------------------- | --------------------------- |
| Verb + noun for workflow skills  | `create-component.skill.md` |
| Noun phrase for knowledge skills | `api-conventions.skill.md`  |
| Adjective + noun for checklists  | `pre-pr-checklist.skill.md` |

## Skill file template

```markdown
---
name: your-skill-name
description: One or two sentences describing what this skill does and when Copilot should use it.
---

# Skill Title

Brief explanation of the skill's purpose.

## Steps / Instructions

1. First step
2. Second step
3. Third step

## Notes

- Any important caveats or edge cases
```

## Tips

- Keep each skill focused on a single responsibility — if a skill is doing too much, split it
- The `description` field is what Copilot uses to decide whether to load the skill; make it precise
- Skills in this folder are local to this project; they won't be available in other repos
- For reusable skills you want across projects, install them to `~/.agents/skills/` via [skills.sh](https://skills.sh) or manually
