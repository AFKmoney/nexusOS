# VFS_SPEC.md

## Purpose

This document describes the current virtual file system behavior implemented in `kernel/fileSystem.ts`.

It is a practical spec of the repo’s current implementation, not a promise of a full POSIX filesystem.

## Main implementation

The VFS is implemented by:
- `VirtualFileSystem` class
- exported singleton `vfs`

The module also exports:
- `SYSTEM_VFS_APP_ID = '__system__'`

## Storage model

The VFS persists to:
- `localStorage` key: `nexus_vfs_v1`

On startup:
- if persisted data exists, it is loaded
- otherwise the VFS is initialized from `INITIAL_FS`
- the initial structure is then saved

## Initial filesystem layout

The current initial tree includes at least:

- `/home/user/Desktop/ReadMe.txt`
- `/home/user/Trash`
- `/system/kernel.log`
- `/system/docs/daemon_whitepaper.txt`

This is the concrete seed tree present in the source file.

## Path handling

### Valid paths
The helper `normalizePath()` only accepts:
- strings
- non-empty values
- strings without null bytes
- strings without `..`
- paths that start with `/`

### Relative paths
If a path does not start with `/`, the VFS attempts to resolve it relative to:

- `/home/<currentUser>/Desktop/<path>`

where `<currentUser>` is read from `window.__OS_STORE__?.getState()?.currentUser?.id`, with fallback `admin`.

## Home directory behavior

`getHomeDir()` returns:
- `/home/<currentUserId>`
- fallback `/home/admin`

This means the effective home directory depends on the current store state when available.

## Node types

The VFS works with file nodes from `types.ts`. The implementation currently handles:
- `file`
- `directory`
- `symlink`

## Core methods

### `resolveNode(path, followSymlinks = true, depth = 0)`
Resolves a node by path.

Behavior notes:
- `/` returns a synthetic root directory node
- symlinks are resolved recursively when `followSymlinks` is `true`
- recursion depth is capped at 10 to avoid loops

### `listDir(path, appId?)`
Returns the names of children in a directory.

Requirements:
- app must have `vfs.read`
- otherwise an empty array is returned

### `readFile(path, appId?)`
Returns file content as a string or `null`.

Requirements:
- app must have `vfs.read`
- non-file nodes return `null`

### `writeFile(path, content, appId?)`
Creates or updates a file.

Requirements:
- app must have `vfs.write`

Events:
- `VFS_FILE_CREATED`
- `VFS_FILE_MODIFIED`

### `createDir(path, appId?)`
Creates a directory.

Requirements:
- app must have `vfs.write`

Events:
- `VFS_DIR_CREATED`

### `createSymlink(targetPath, linkPath, appId?)`
Creates a symlink.

Requirements:
- app must have `vfs.write`

### `delete(path, appId?)`
Deletes a node.

Requirements:
- app must have `vfs.write`

Events:
- `VFS_FILE_DELETED`

### `moveMany(moves, appId?)`
Moves multiple nodes in one pass.

Requirements:
- app must have `vfs.write`

Behavior notes:
- uses cached directory lookups for efficiency
- skips invalid or conflicting moves
- returns `true` only if at least one move succeeded

### `move(oldPath, newPath)`
Moves a single node.

Important note:
- this method calls deletion with `SYSTEM_VFS_APP_ID`
- it then reattaches the node under the destination parent

### `moveToTrash(path)`
Moves a node into the current user’s Trash directory.

Behavior:
- ensures the Trash directory exists
- if the path is already in Trash, it deletes it instead
- otherwise it renames the item with a timestamp suffix

### `updateMetadata(path, metadata)`
Merges partial metadata into the target node and saves.

### `getStats(path)`
Returns:
- `size`
- `files`
- `folders`

This is a tree traversal count, not a disk usage calculation.

## Permission model inside the VFS

The VFS uses its own permission gate:
- `vfs.read`
- `vfs.write`

Permission checks consult `window.__OS_STORE__?.getState()?.registry` for app manifests.

### Special system bypass
`SYSTEM_VFS_APP_ID` bypasses VFS permission checks.

### Missing app ID
If `appId` is missing for a protected VFS call, the operation is denied.

That is the current behavior in this repo and should be treated as authoritative.

## Event model

The VFS emits events through `eventBus`.

Observed events in the source:
- `VFS_FILE_CREATED`
- `VFS_FILE_MODIFIED`
- `VFS_DIR_CREATED`
- `VFS_FILE_DELETED`

The event payload includes:
- `path`
- `appId`

## Error handling style

The VFS generally uses defensive returns instead of exceptions:
- invalid paths return `null`, `false`, or `[]`
- permission failure logs to console and returns a safe failure value
- directory/file conflicts are rejected quietly

## Known limitations

Current implementation limitations include:
- no real POSIX ACL model
- no versioned schema migration layer
- no explicit recycle-bin metadata model beyond path moves
- no audit trail beyond event emission
- no resource-level locking
- no filesystem watcher API beyond event emission
- no persistence encryption

## Practical reading of the current design

The VFS is a browser-persisted, app-permission-gated virtual tree with a small set of file operations and a clear system-level bypass for internal code paths.

## What to assume when coding against it

- use absolute paths when possible
- provide a valid `appId` for app-originated operations
- expect permission denials to fail safely rather than throw
- treat `__system__` as privileged internal use only
- do not assume hidden POSIX semantics that are not implemented here