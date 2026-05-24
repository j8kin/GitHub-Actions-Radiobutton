# PR Radiobutton Checkboxes

A GitHub Action that enforces mutual exclusivity among checkboxes in designated radio-button groups in PR descriptions.
When a contributor checks one option in a group, all other options in that group are automatically unchecked — just like
HTML radio buttons.

## Usage

Add this action to a workflow that triggers on `pull_request` events:

```yaml
name: PR Radiobutton Checkboxes

on:
    pull_request:
        types: [opened, edited, synchronize, reopened]

jobs:
    radiobutton:
        runs-on: ubuntu-latest
        permissions:
            pull-requests: write
        steps:
            - uses: j8kin/GitHub-Actions-Radiobutton@v1.0.0
              with:
                  github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Radio Group Syntax

Mark sections of your PR description template with HTML comment markers to define a radio group. Only one checkbox
within a group can be checked at a time.

```markdown
## Change Type

<!-- radiobutton-group:change-type -->

- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
  <!-- /radiobutton-group -->

## Environment

<!-- radiobutton-group:environment -->

- [ ] Development
- [ ] Staging
- [ ] Production
  <!-- /radiobutton-group -->
```

The `:name` suffix on the opening tag is optional but recommended — it makes groups identifiable in the action output.

When a PR author checks "Bug fix", the action automatically unchecks all other items in that group and updates the PR
body.

## Inputs

| Input             | Required | Default               | Description                                                                                                                           |
| ----------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `github-token`    | No       | `${{ github.token }}` | GitHub token used to update the PR body. The built-in token is sufficient when the workflow has `pull-requests: write` permission.    |
| `branch-patterns` | No       | `""` (all PRs)        | Newline-separated list of branch patterns controlling which PRs the action applies to. See [Branch Patterns](#branch-patterns) below. |

## Outputs

| Output        | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `updated`     | `"true"` if the PR body was modified, `"false"` otherwise. |
| `group-count` | Number of radio groups found in the PR body.               |

## Branch Patterns

Use `branch-patterns` to restrict the action to specific PR flows. Each line has the format
`head-pattern -> base-pattern`, using glob syntax.

```yaml
- uses: j8kin/GitHub-Actions-Radiobutton@v1.0.0
  with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      branch-patterns: |
          feature/** -> main
          hotfix/** -> main
          release/** -> main
```

| Pattern              | Meaning                                             |
| -------------------- | --------------------------------------------------- |
| `feature/** -> main` | Only PRs from `feature/*` branches targeting `main` |
| `hotfix/** -> main`  | Only PRs from `hotfix/*` branches targeting `main`  |
| `** -> develop`      | All PRs targeting the `develop` branch              |
| _(empty)_            | All PRs, regardless of branch names                 |

## Latency & Behavior

This action runs on the GitHub Actions `pull_request` event, so expect a **~8–10 second delay** between editing the PR
description and seeing the checkboxes update. The delay comes from GitHub Actions itself, not the action's logic:

- ~1–3s — webhook delivery and workflow queueing
- ~3–6s — GitHub-hosted runner cold start
- ~1–2s — action execution and PR body update

**The PR page does not auto-refresh** — after editing the description, reload the page to see the action's update. If
you don't refresh, the checkboxes will appear unchanged even after the workflow has completed.

If you need lower latency, a self-hosted runner eliminates the cold-start cost (~3–6s). Sub-second response is only
achievable by replacing the action with a GitHub App backed by a persistent webhook listener.

## License

MIT
