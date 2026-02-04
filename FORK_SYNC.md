# Fork Sync Guide

This document explains how to sync this OpenCode fork with the upstream repository.

## Setup (One-time)

The upstream remote should already be configured:

```bash
git remote -v
# origin    https://github.com/GutMutCode/opencode.git (fetch/push)
# upstream  https://github.com/anomalyco/opencode.git (fetch/push)
```

If `upstream` is missing:

```bash
git remote add upstream https://github.com/anomalyco/opencode.git
```

## Sync Workflow

### 1. Fetch latest from upstream

```bash
cd external/opencode
git fetch upstream
```

### 2. Check how many new commits

```bash
git rev-list --left-right --count dev...upstream/dev
# Output: X    Y
# X = commits ahead (fork-specific)
# Y = commits behind (new upstream commits)
```

### 3. Merge upstream

```bash
git merge upstream/dev --no-edit
```

### 4. Resolve conflicts (if any)

Common conflict patterns:

| File                   | Resolution Strategy                    |
| ---------------------- | -------------------------------------- |
| `plugin/index.ts`      | Use upstream's newer plugin versions   |
| `provider/provider.ts` | Combine both changes (fork + upstream) |
| `package.json`         | Use upstream version numbers           |

After resolving:

```bash
git add -A
git commit -m "chore: merge upstream/dev (N commits from anomalyco/opencode)

Resolved conflicts:
- file1: description
- file2: description"
```

### 5. Push to fork

```bash
git push origin dev --force-with-lease
```

> Use `--force-with-lease` because merge creates divergent history from origin.

### 6. Update submodule reference (in parent repo)

```bash
cd ../..  # back to agentation root
git add external/opencode
git commit -m "chore: update opencode submodule to latest"
git push
```

## Fork-Specific Changes

This fork maintains the following customizations:

| Feature      | Files                                | Description                     |
| ------------ | ------------------------------------ | ------------------------------- |
| MCP Sampling | `src/mcp/*`                          | Sampling support for agentation |
| Release CI   | `.github/workflows/release-fork.yml` | Auto-release on push to dev     |

When merging, ensure these files preserve fork-specific logic.

## Troubleshooting

### Uncommitted local changes block merge

```bash
git stash push -m "local changes"
git merge upstream/dev
git stash pop  # restore after merge
```

### Branch ref conflicts during fetch

```bash
git remote prune upstream
git fetch upstream
```

### Need to see what changed in upstream

```bash
git log dev..upstream/dev --oneline  # new upstream commits
git log upstream/dev..dev --oneline  # fork-only commits
```
