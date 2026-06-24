# Security Policy

## Reporting a Vulnerability

Please report security issues privately to the maintainer rather than opening a
public issue.

## Secrets Handling

- API keys and secrets MUST NOT be committed. Use a local `.env` file (already
  covered by `.gitignore`: `.env`, `.env.local`, `.env.*.local`).
- AI provider keys are entered by the end user at runtime and persisted in the
  browser's local storage — they should never appear in source control.

## Known Incident — Leaked Mistral API Key (resolved 2026)

A Mistral API key was previously committed (in commits `0f10eb9`, `3b611a7`,
and propagated through `eeb16f6` and `301c8ec`). The key has since been:

1. **Removed from the working tree** in commit `eeb16f6` ("remove leaked secret").
2. **Purged from git history** via `git filter-repo --replace-text`. Every
   occurrence of the key string across all historical commits has been
   replaced with the literal token `REDACTED`. All commit SHAs after the
   original leak have been rewritten; the history-rewrite force-push was
   coordinated on `2026-06-24` and is reflected on all branches of the
   canonical remote.

### Required maintainer action (cannot be done in code)

**Rotate the key now** if you have not already. Log in to the Mistral console
(<https://console.mistral.ai/>), revoke the exposed key, and issue a new one.
Even though the key is no longer in the git history, it was exposed on the
public remote for an extended period and must be treated as compromised.
History rewriting does **not** undo the exposure — only rotation closes the
risk.

### Verification

You can confirm the key string is gone from history with:

```sh
git log --all -p | grep -c 'yZ3fZ2ytzJNtcaNRIfDzkFyPqyfAJXU6'   # should print 0
git log --all -p | grep -c 'REDACTED'                            # should print > 0
```

### Notes for collaborators

The force-push on `2026-06-24` rewrote every commit SHA from `0f10eb9`
onwards. If you have a local clone from before that date:

```sh
git fetch --all
git reset --hard origin/<your-branch>
```

Any branches you had based on the old SHAs will need to be rebased on top of
the new history. Open pull requests against the old SHAs may need to be
closed and re-opened.
