# Security Policy

## Reporting a Vulnerability

Please report security issues privately to the maintainer rather than opening a
public issue.

## Secrets Handling

- API keys and secrets MUST NOT be committed. Use a local `.env` file (already
  covered by `.gitignore`: `.env`, `.env.local`, `.env.*.local`).
- AI provider keys are entered by the end user at runtime and persisted in the
  browser's local storage — they should never appear in source control.

## Known Incident — Leaked Mistral API Key

A Mistral API key was previously committed and was removed from the working tree
in commit `eeb16f6` ("remove leaked secret"). The key string still exists in
**git history** in commits prior to that fix.

### Required remediation (maintainer action — cannot be done in code)

1. **Rotate the key now.** Log in to the Mistral console
   (<https://console.mistral.ai/>), revoke the exposed key, and issue a new one.
   This is the only effective remediation: once a secret has been pushed to a
   shared/public remote it must be treated as compromised regardless of any
   later history rewrite.
2. (Optional) Purge it from history. If you also want the string gone from the
   git history, rewrite history with a dedicated tool and force-push **all**
   refs — coordinate with every collaborator first, since this rewrites shared
   history:

   ```sh
   # Install git-filter-repo, then from a fresh clone:
   git filter-repo --replace-text <(echo 'yZ3fZ2ytzJNtcaNRIfDzkFyPqyfAJXU6==>REDACTED')
   git push --force --all
   git push --force --tags
   ```

   > History rewriting is intentionally **not** performed as part of a normal
   > pull request: it is destructive, force-pushes shared branches, and does not
   > undo the exposure. Step 1 (rotation) is mandatory and sufficient to close
   > the risk; step 2 is cosmetic cleanup.
