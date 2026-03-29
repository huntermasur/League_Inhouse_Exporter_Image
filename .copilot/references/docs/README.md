# Docs

Place external and supplemental documentation here so Copilot and teammates have reference material during development.

## What belongs here

- **API specs** — OpenAPI/Swagger YAML or JSON for any APIs being consumed or produced
- **Third-party integration guides** — vendor docs, SDK references, setup instructions
- **Decision write-ups** — longer-form rationale that doesn't fit in `decisions.md`
- **Onboarding guides** — how to get the project running, environment setup steps
- **Research notes** — spikes, proof-of-concept findings, technology evaluations

## Recommended formats

- `.md` — preferred for prose documents (renders in GitHub, readable in editor)
- `.yaml` / `.json` — API specs (OpenAPI, AsyncAPI)
- `.pdf` — vendor documentation where original format must be preserved

## Tips

- Link to these files from `project-brief.md` or component READMEs when relevant
- Keep API specs in sync with the actual implementation — drift causes confusion
- Prefer linking to live external docs over copying them; only copy content that may disappear
