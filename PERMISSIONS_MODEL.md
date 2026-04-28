# PERMISSIONS_MODEL.md

## Purpose

This document describes the current permission model used by NexusOS in the repository as it exists now.

## Core permission types

`kernel/permissions.ts` defines the following permission union:
- `vfs.read`
- `vfs.write`
- `network`
- `kernel.modify`

These are the only permissions currently represented in that module.

## Permission source of truth

The permission system reads app declarations from `appRegistry.ts` via `SYSTEM_APPS`.

That means:
- permissions are declared per app in the registry
- permission checks are not free-form
- an app must be present in the registry to resolve its base permissions

## Main API surface

`kernel/permissions.ts` exports:
- `permissions`

The `permissions` instance provides:

- `hasPermission(appId, permission)`
- `enforce(appId, permission, action?)`
- `grant(appId, permission)`
- `revoke(appId, permission)`
- `getPermissions(appId)`
- `isRegistered(appId)`

## Behavior summary

### `hasPermission`
Returns `true` when:
- `appId` is safe and non-empty
- the permission value is one of the supported permission strings
- either:
  - a temporary override exists, or
  - the registry manifest for that app includes the permission

Returns `false` otherwise.

### `enforce`
Throws an error if the app does not have the requested permission.

This is the strictest API and should be used when denial must stop execution.

### Temporary overrides
`grant` and `revoke` maintain in-memory overrides for the current runtime.

Important notes:
- overrides are not described as persisted
- overrides are process-local to the current runtime instance
- overrides can temporarily expand an app’s effective permissions

### `getPermissions`
Returns the union of:
- manifest-declared permissions
- active overrides

### `isRegistered`
Checks whether an app ID exists in the app registry.

## Safety checks

The implementation includes basic safety validation:
- app IDs must be strings with a length between 1 and 128
- null bytes are rejected
- permission values must match the known union

## Relationship with the VFS

`kernel/fileSystem.ts` also performs permission checks for VFS operations.

In that module:
- `vfs.read` is required for `listDir` and `readFile`
- `vfs.write` is required for write-style operations such as:
  - `writeFile`
  - `createDir`
  - `createSymlink`
  - `delete`
  - `moveMany`

That makes the VFS one of the main consumers of the permission model.

## System VFS access

`kernel/fileSystem.ts` defines:
- `SYSTEM_VFS_APP_ID = '__system__'`

For the VFS layer, this app ID is treated as a system-level bypass for permission checks.

That bypass is specific to the VFS implementation and should be considered a privileged internal path, not a general app permission pattern.

## Important behavioral detail

In `kernel/fileSystem.ts`, if an app ID is missing during a VFS permission check, the access is denied and the operation is blocked.

That is stricter than the fallback behavior in some earlier audit notes and should be treated as the current repo truth.

## Known limitations

The current model is functional but simple:
- no role-based hierarchy
- no per-resource ACLs
- no persisted override lifecycle
- no audit log in the permission module itself
- no explicit distinction between browser-only and desktop-only permissions

## Recommended usage

For new code:
- declare permissions in the app registry
- enforce with `permissions.enforce(...)` where denial should stop the action
- use VFS permission gates for filesystem access
- avoid relying on implicit access without an `appId`

## Summary

The current permission model is a registry-driven, permission-string-based system with a small fixed permission vocabulary and a runtime override mechanism. It is sufficient for the current VFS and shell architecture, but it is not yet a full security sandbox.