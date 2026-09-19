# GitHub repository settings

The repository files automate most public-project hygiene. Two settings remain
repository-admin controls rather than files.

## Recommended before broad promotion

### Protect `main`

In **Settings → Rules → Rulesets**, create a branch ruleset targeting
`main` with:

- require a pull request before merging;
- require the **CI / check** status check;
- block force pushes;
- block branch deletion;
- require branches to be up to date before merge if you prefer strict CI.

For a one-maintainer reference project, one approving review is optional; the
important controls are PRs, CI, and no force pushes.

### Merge strategy

In **Settings → General → Pull Requests**:

- enable **Squash merging**;
- disable merge commits;
- optionally disable rebase merging;
- enable automatically deleting head branches after merge.

This keeps the public history compact and makes the changelog/release trail
easier to follow.

## Security settings

In **Settings → Security**:

- enable private vulnerability reporting if available;
- keep Dependabot alerts and security updates enabled;
- enable GitHub secret scanning / push protection when available for the repo.

If secret scanning ever reports a real provider key, rotate the key immediately
even if the commit is later rewritten.

## Current release process

- Version lives in `package.json`.
- Changes are summarized in `CHANGELOG.md`.
- Stable points are tagged as `vX.Y.Z`.
- CI runs `npm ci`, `npm run check`, and a high-severity production
  dependency audit.
