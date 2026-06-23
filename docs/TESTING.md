# Testing

> The canonical testing document lives at the repository root in
> [`../TESTING.md`](../TESTING.md) (version 2.0.6, 208 lines).
>
> This file used to hold a 112-line evidence-based snapshot that drifted
> out of sync with the actual test layout (it claimed only 7 kernel test
> files when the repo now ships 14 + utils tests + an e2e harness). To
> avoid duplicate sources of truth, the canonical reference is the root
> file. Update only that one — the link from this directory is
> intentional so existing `docs/` links still resolve.
>
> Current test count: **90 passing** across 14 test files in
> `kernel/tests/`, plus `utils/uuid.test.ts`, `utils/nfrEngine.test.ts`,
> and `e2e/appSmoke.mjs` (headless Chrome smoke test that opens every
> registered app).
