---
description: Generate a structured git commit message
---

# Commit Message Workflow

Given the staged git diff, generate a commit message following this exact structure:

## Format

```
<type>(scope): <short summary>

Why: <motivation — what problem or need drove this change>
What: <high-level description of the change>
How: <implementation notes or trade-offs>
```

## Types

`feat` | `fix` | `chore` | `docs` | `refactor` | `perf` | `test` | `build` | `ci` | `revert` | `style`

## Rules

- **scope**: lowercase, kebab-case, matches the file/feature area (e.g. `hero-section`, `navbar`, `stats`)
- **short summary**: imperative mood, no period, max ~60 chars
- **Why / What / How**: each a single concise sentence — no bullet points inside them
- Do NOT include `Fixes #` or `Refs #` references

## Example Output

```bash
git commit -m "feat(apply-form): add zod validation" \
  -m "Why: Prevent users from submitting invalid dates of birth." \
  -m "What: Add Zod schema to the apply form and block invalid DOB." \
  -m "How: Disable submit until schema passes; show inline error messages."
```

## Steps

1. Run `git diff --staged` to inspect what is staged
// turbo
2. Analyze the diff — identify the scope, the type, and the intent of the change
3. Output the `git commit` command in the exact multi-line `-m` format above, ready to copy-paste
