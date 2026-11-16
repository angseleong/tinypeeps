# Domain docs

How agents should use this repo's domain documentation.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`**: read the ADRs that touch the area you're about to work in.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a proposal or a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, either you're inventing language the project doesn't use, or there's a real gap to add.

## Be honest about status

An ADR marked `proposed` isn't decided. Don't describe anything in `README.md` or `docs/` as working until a test or a real run shows it.
