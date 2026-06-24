# NexusOS — Virtual File System Specification

This document specifies the behavior of `kernel/fileSystem.ts` as implemented in this repository. It describes the actual contract a contributor or external integrator should rely on, not an idealized POSIX semantics.

---

## 1. Identity

The VFS is implemented as a single class `VirtualFileSystem` with an exported singleton `vfs`. The module also exports `SYSTEM_VFS_APP_ID = '__system__'`, a sentinel application identifier that bypasses permission checks.

The VFS is the single source of truth for persistent file-shaped data within NexusOS. It is consumed by:

- The Zustand store, indirectly through event-bus notifications.
- All 52 built-in applications.
- The autonomy engine (read-only system snapshots, write-only journal entries).
- The DAEMON bridge (manifest, journal, log persistence).
- The Terminal (`commander.ts`).
- The IDE and editor applications.

The VFS does **not** wrap the host filesystem. In Electron mode, downloaded model files live outside the VFS at the user-data directory and are accessed through the `nexus://` protocol; the VFS holds only browser-visible content.

---

## 2. Persistence model

### 2.1 Storage tiers

The VFS persists in two tiers:

| Tier | Backend | When used |
|---|---|---|
| Primary | IndexedDB (database `NexusOS_VFS`, object store `vfs_store`, key `vfs_root`) | Default for runtime persistence. |
| Secondary | `localStorage` (key `nexus_vfs_v1`) | Legacy migration target and fallback when IndexedDB is unavailable. |

### 2.2 Initialization flow

The constructor seeds the in-memory tree from `INITIAL_FS` synchronously, so the OS shell can render before storage hydration completes. `init()` is called asynchronously after construction:

1. Attempt `idbGet()` against the IndexedDB store.
2. If the result is non-null, use it as the in-memory root.
3. If the result is null, attempt to read the legacy `localStorage` key. If present, parse and adopt it as the root, then persist it to IndexedDB.
4. If both reads succeed without data, retain `INITIAL_FS` and persist it to IndexedDB.
5. If `idbGet()` throws (for example, the runtime has no IndexedDB), catch and fall back to the legacy `localStorage` read.

After `init()` returns, the VFS marks itself as initialized; subsequent writes are persisted.

### 2.3 Save semantics

Writes go through `save()`, which is debounced by 100 ms. Multiple writes within the debounce window collapse into a single persistence transaction. The `batch(fn)` method suspends the debounce, executes the closure, and triggers a single save afterward; this is the recommended pattern for bulk operations.

Persistence failures (quota exceeded, IndexedDB transaction error) are logged and degrade silently to `localStorage`. If `localStorage` also fails, the VFS continues to operate in-memory; the warning is surfaced through `console.error` and is observable in the Dashboard's runtime log.

### 2.4 Initial layout

The initial filesystem includes at minimum:

```
/
├── home/
│   └── user/
│       ├── Desktop/
│       │   └── ReadMe.txt
│       └── Trash/
└── system/
    ├── kernel.log
    └── docs/
        └── daemon_whitepaper.txt
```

Additional directories appear as the active user is resolved (`/home/<user>/Desktop`, `/home/<user>/Trash`).

---

## 3. Path handling

### 3.1 Normalization rules

`normalizePath()` accepts a path argument and validates it against five rules:

1. The argument must be a string.
2. The string must be non-empty.
3. The string must not contain a null byte (`\0`).
4. The string must not contain a `..` segment.
5. The string must start with `/` (absolute) **or** be resolvable relative to the active user's desktop.

Values that fail any rule are rejected; the operation returns a safe default (`null`, `false`, or `[]`).

### 3.2 Relative path resolution

When a path does not start with `/`, the VFS attempts to resolve it relative to:

```
/home/<active-user>/Desktop/<path>
```

The active user is read from `window.__OS_STORE__?.getState()?.currentUser?.id`, falling back to `admin` if the store is not yet initialized.

### 3.3 Home directory

`getHomeDir()` returns:

```
/home/<active-user-id>
```

with `admin` as the fallback when the store is unavailable.

---

## 4. Node types

The VFS recognizes three node types defined in `types.ts`:

| Type | Fields |
|---|---|
| `file` | `name`, `type`, `permissions`, `content`, `created`, `modified`, optional metadata |
| `directory` | `name`, `type`, `permissions`, `children` (record of name → node) |
| `symlink` | `name`, `type`, `permissions`, `targetPath` |

Symlinks are resolved by `resolveNode()` recursively when `followSymlinks` is true. Recursion depth is capped at 10 to prevent cycles.

---

## 5. Operations

### 5.1 `resolveNode(path, followSymlinks = true, depth = 0)`

Returns the file node at the given path, or `null` if the path is invalid or the node does not exist.

- The path `/` returns a synthetic root node aggregating top-level directories.
- Symlinks are followed recursively when `followSymlinks` is true.
- Depth above 10 returns `null`.

### 5.2 `listDir(path, appId?)`

Returns the names of children at the given directory path, or `[]` on failure.

- Requires the caller to have `vfs.read`.
- Missing or invalid `appId` returns `[]` and emits a sandbox warning.
- Non-directory targets return `[]`.

### 5.3 `readFile(path, appId?)`

Returns the file content as a string, or `null` on failure.

- Requires the caller to have `vfs.read`.
- Non-file nodes return `null`.
- Missing `appId` returns `null` with a sandbox-blocked log entry.

### 5.4 `writeFile(path, content, appId?)`

Creates or updates a file node. The parent directory is created on demand.

- Requires the caller to have `vfs.write`.
- Emits `VFS_FILE_CREATED` for a new file, `VFS_FILE_MODIFIED` for an existing file.
- Empty `content` is permitted.

### 5.5 `createDir(path, appId?)`

Creates a directory.

- Requires `vfs.write`.
- Idempotent: creating an existing directory is a no-op.
- Emits `VFS_DIR_CREATED`.

### 5.6 `createSymlink(targetPath, linkPath, appId?)`

Creates a symbolic link at `linkPath` pointing to `targetPath`.

- Requires `vfs.write`.
- The target need not exist at link time; resolution happens at use time.
- Cycles are detected at resolution time, not at creation time.

### 5.7 `delete(path, appId?)`

Removes a node and all of its descendants.

- Requires `vfs.write`.
- Emits `VFS_FILE_DELETED`.
- Returns `false` if the path does not resolve.

### 5.8 `move(oldPath, newPath)`

Moves a single node from `oldPath` to `newPath`.

- Internal callers use `SYSTEM_VFS_APP_ID` for the deletion step.
- The destination parent must exist.
- Conflict (target name already taken) is rejected.

### 5.9 `moveMany(moves, appId?)`

Moves multiple nodes in one transaction.

- `moves` is an array of `{ from, to }` objects.
- Requires `vfs.write`.
- Uses cached directory lookups for efficiency on large move sets.
- Skips invalid or conflicting moves; returns `true` if at least one move succeeded.

### 5.10 `moveToTrash(path)`

Soft-deletes a node by moving it under the active user's `Trash` directory.

- Ensures `Trash` exists before moving.
- If the path is already inside `Trash`, the operation degrades to a hard delete.
- The moved node receives a timestamp suffix to avoid name collisions.

### 5.11 `updateMetadata(path, metadata)`

Merges the provided metadata into the target node and persists.

- Useful for setting `aiTags`, `summary`, `smartLabel`, or other AI-managed fields.
- Does not require an `appId` argument because it is internal-only.

### 5.12 `getStats(path)`

Returns aggregated counts:

```ts
{ size: number; files: number; folders: number }
```

The `size` field is a tree-traversal count of byte content, not a disk-usage figure.

### 5.13 `stat(path)`

Returns the raw `FileNode` (without resolving symlinks) or `null`.

---

## 6. Permission model

### 6.1 Capability set

The VFS recognizes two capabilities:

| Capability | Granted by |
|---|---|
| `vfs.read` | Application manifest declaration in `appRegistry.ts` |
| `vfs.write` | Application manifest declaration in `appRegistry.ts` |

The `network` and `kernel.modify` capabilities are also defined in the permission system but are not consulted by the VFS itself.

### 6.2 Authorization flow

For every protected operation:

1. The caller passes an `appId` argument.
2. The VFS reads the application registry from `window.__OS_STORE__?.getState()?.registry`.
3. The application manifest is located by id.
4. The required capability is checked against `manifest.permissions`.
5. If the manifest is absent, or the capability is missing, the operation is denied: a warning is logged, a sandbox-blocked error is emitted, and a safe default is returned.

### 6.3 System bypass

`SYSTEM_VFS_APP_ID = '__system__'` skips the registry lookup and the capability check. It is intended for kernel-internal operations: VFS migration, autonomy journal writes, daemon bridge bootstrap.

Application code must not use `SYSTEM_VFS_APP_ID`. Linting for this is on the roadmap; for now, reviewers enforce it during code review.

### 6.4 Missing `appId`

If an `appId` is required and not provided, the operation is denied. The console output identifies the deny path:

```
[Permissions] Missing appId for permission check (vfs.read)
[Sandbox Enforcer] Blocked undefined from reading <path>
```

This is a deliberate fail-closed posture.

---

## 7. Event model

The VFS emits events through `kernel/eventBus.ts` for every state-changing operation:

| Event | Trigger | Payload |
|---|---|---|
| `VFS_FILE_CREATED` | new file written | `{ path, appId }` |
| `VFS_FILE_MODIFIED` | existing file overwritten | `{ path, appId }` |
| `VFS_FILE_DELETED` | file or directory removed | `{ path, appId }` |
| `VFS_DIR_CREATED` | new directory created | `{ path, appId }` |

Subscribers receive the payload synchronously after the in-memory mutation, before the persistence flush completes. Subscribers must therefore not assume the change is durable; they should await persistence by listening to a follow-up persistence event or by issuing a read-back if durability matters.

The DAEMON bridge subscribes to `VFS_FILE_CREATED` and `VFS_FILE_MODIFIED` to trigger smart-node hooks. Hook execution is currently disabled in the hardened build.

---

## 8. Error handling style

The VFS uses defensive returns rather than exceptions:

- Invalid paths return `null`, `false`, or `[]`.
- Permission denials log to the console and return the same safe defaults.
- Directory or file conflicts are rejected quietly.
- Resolution depth overrun returns `null`.

This style is chosen because the consumers of the VFS (autonomy loop, application components, IPC handlers) cannot reasonably handle every possible exception. Consumers who need detailed failure information should consult `console.error` output or the runtime log.

The opposite style (throwing) would be more idiomatic but would force every caller to wrap every operation in a `try`/`catch`, which is the historical pattern that the audit branch is removing in favor of explicit defensive returns.

---

## 9. Known limitations

The current implementation does not provide:

- POSIX ACL semantics. The capability model is coarse (read or write at the appId level); per-node ownership and per-user permissions are not enforced.
- Versioned schema migration. A future change to the `FileNode` shape would require a manual migration path.
- Recycle-bin metadata. Trashed nodes are renamed with a timestamp suffix; original path, deletion time, and reason are not preserved beyond the name.
- Audit trail beyond event emission. Events are not persisted to a tamper-resistant log.
- Resource locking. Concurrent writes on the same path race; the last writer wins.
- Persistence encryption. IndexedDB content is unencrypted at rest.
- Filesystem watcher API beyond event emission. `inotify`-style recursive watching is not exposed.
- Real disk-usage metrics. `getStats()` reports content-byte counts, not page-aligned or compressed disk usage.

---

## 10. Practical guidance

When coding against the VFS:

- Use absolute paths (`/home/user/Documents/...`). Relative resolution exists but is implicit.
- Always pass a valid `appId` for application-originated operations. The application manifest must declare the required capability.
- Treat permission denials as routine. The VFS fails closed and silent; the absence of an event is the cue.
- Use `SYSTEM_VFS_APP_ID` only in kernel modules. Application code that needs an elevated capability should declare the capability in its manifest.
- Use `batch(fn)` for bulk operations to avoid the 100 ms debounce flush pattern.
- For large model files or other binary blobs, prefer the host filesystem (Electron mode) over the VFS. The VFS is unbounded in size but slow to persist.
- Consult the test file `kernel/tests/fileSystem.test.ts` before changing the VFS contract; the test suite is authoritative.
