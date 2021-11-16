# Git Flow Action
The Git Flow Action is a GitHub Action that assists with the Git Flow branching model.
It's feature are:

- **Comment when a pull request has a head branch name that doesn't have the feature branch or hotfix branch prefix**

- **Comment when a feature pull request doesn't target a development branch or another feature branch**<br>
  Because pull requests for feature branches should never target a main branch.
  
- **Comment when a hotfix pull request doesn't target a development branch or main branch**<br>
  Because pull requests for hotfix branches should never target other branches than these.

- **Convert pull requests for cascading feature branches to draft automatically**<br>
  This prevents them from being merged accendentally into the base feature branch.

## Usage

Create a personal access token with the `repo` permission and store it in a repository or organization level secret called `GIT_FLOW_ACTION_PAT`.
You can then create the following workflow file in your repository.

`.github/workflows/check-pr.yml`:
```yaml
name: Check PR

on:
  pull_request:
    types: [opened, edited]

jobs:

  check-branches:
    name: Check base branch and branch name
    runs-on: ubuntu-latest
    steps:
      - uses: semestry/git-flow-action@v1
        env:
          GITHUB_TOKEN:  ${{ secrets.GIT_FLOW_ACTION_PAT }}
```

## Configuration options

You can override configuration options using in the workflow file. For example:

```yaml
      - uses: semestry/git-flow-action@v1
        env:
          GITHUB_TOKEN:  ${{ secrets.GIT_FLOW_ACTION_PAT }}
        with:
          feature_branch_prefix: 'feat/'
```

| Option                       | Description                                                                     |
|------------------------------|---------------------------------------------------------------------------------|
| `main_branch_pattern`        | Regex for matching main branches. Default: `^(main|master)$`                    |
| `development_branch_pattern` | Regex for matching development branches. Default: `^(dev|develop|development)$` |                                                              |
| `feature_branch_prefix`      | Feature branch prefix. Default: `feature/`                                      |
| `hotfix_branch_prefix`       | Hotfix branch prefix. Default: `hotfix/`                                        |
