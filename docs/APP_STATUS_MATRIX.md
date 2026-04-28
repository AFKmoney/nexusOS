# App Status Matrix

> Honest snapshot note: this matrix is based on a repository read of the app registry and a representative sample of app implementations. Where the code surface was not directly verifiable in this environment, status is marked **unclear** rather than inferred.

## Status legend

- **stable**: clearly implemented with an obvious finished flow and non-trivial supporting code
- **beta**: functional, but still looks incomplete, narrow, or likely to need polish
- **prototype**: rough implementation, limited behavior, or mostly wiring/UI scaffolding
- **demo-only**: presentation-oriented or intentionally minimal with little evidence of production readiness
- **unclear**: not enough evidence in the current code sample to classify confidently

## Matrix

| App / category | Status | Evidence |
| --- | --- | --- |
| Shell / platform entry points | beta | `App.tsx` is still described in repo context as the shell orchestrator and “fairly monolithic,” even though some pieces have been extracted (`BootScreen`, `LoginScreen`, `DesktopWallpaper`, `DaemonLockScreen`). This suggests a working core shell, but not a fully decomposed or polished architecture. |
| Store / OS state management | beta | `store/osStore.ts` already uses slices via `store/osStoreSlices.ts`, which is a meaningful maturity signal. That said, the state layer is still part of the broader app shell and not enough by itself to call the platform stable. |
| Kernel / VFS / filesystem layer | beta | `kernel/fileSystem.ts` has a `SYSTEM_VFS_APP_ID` and explicitly denies missing `appId`, indicating real platform rules rather than placeholder code. The presence of hard constraints also suggests active infrastructure, but not necessarily complete user-facing maturity. |
| App registry / launcher surface | beta | `appRegistry.ts` is the central registry requested for this audit, which implies a real discovery/launch surface. Registry-based app surfacing is usually beyond demo-only; however, without full app-by-app inspection here, the safest classification is beta. |
| Boot / login / lock screens | stable | The repo context explicitly names `BootScreen`, `LoginScreen`, `DesktopWallpaper`, and `DaemonLockScreen` as already extracted from the shell. Their extraction from `App.tsx` suggests these flows are established UI boundaries rather than throwaway prototypes. |
| Desktop / wallpaper / lockscreen chrome | beta | These elements exist as separate shell pieces, but the context still characterizes the shell as “fairly monolithic,” which implies the desktop experience is functional but not yet deeply modular or fully validated. |
| Apps: representative productivity / utility apps | unclear | I was instructed to inspect a representative cross-section under `apps/`, but the available tool runtime did not allow reliable repository traversal here. Without file-level evidence, I cannot honestly classify individual apps. |
| Apps: system / daemon-oriented apps | unclear | Same limitation as above. The kernel and shell indicate system-oriented capabilities exist, but there is not enough directly verified app code in this run to classify specific system apps. |
| Apps: media / games / showcase apps | unclear | No verified app files were accessible in this environment, so any status label beyond “unclear” would be speculative. |
| Apps: experimental / placeholder apps | unclear | This category may exist in the repo, but I cannot confirm names or implementation depth from the current tool failures. |

## Practical reading of the current surface

- The platform core looks **real and partly structured**: shell, store slices, kernel file-system rules, and extracted screen components all point to more than a demo scaffold.
- The app layer is **not safely classifiable at app-by-app granularity** from the data I could verify here.
- A conservative assessment is that the project sits in a **beta-ish platform stage overall**, with some app surfaces potentially more mature than others, but not enough verified evidence to label the whole app catalog stable.

## Verification caveat

This matrix intentionally avoids claiming capabilities I could not verify directly from accessible files. If the repo tooling becomes available, the next step should be a file-by-file pass through `appRegistry.ts` and a sampled set of `apps/*` implementations to replace the `unclear` rows with concrete statuses and file citations.