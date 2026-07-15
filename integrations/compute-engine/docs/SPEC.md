# Google Compute Engine Integration Specification

## Overview

The integration exposes the 29 Compute Engine tools in the official Google Cloud MCP surface. It covers VM lifecycle, disk and catalog inspection, managed instance groups, instance templates, reservations, commitments, and zonal operation polling through Compute Engine v1.

## Configuration

- `projectId` (required): Google Cloud project ID inserted into every Compute Engine resource path.
- `defaultZone` (optional): fallback for VM, disk, machine type, accelerator, managed instance group, reservation, and zone-operation tools.
- `defaultRegion` (optional): fallback for commitment tools.

A tool-provided `zone` or `region` takes precedence over configuration. A zonal or regional tool returns a user-facing `ServiceError` when no location can be resolved.

## Authentication

### Google OAuth 2.0

The OAuth authorization-code flow requests offline access, supports refresh tokens, and exposes these consent scopes:

- `https://www.googleapis.com/auth/compute` (selected by default)
- `https://www.googleapis.com/auth/compute.readonly`
- `https://www.googleapis.com/auth/cloud-platform`
- `https://www.googleapis.com/auth/userinfo.profile` (selected by default)
- `https://www.googleapis.com/auth/userinfo.email` (selected by default)

Callback and refresh responses persist the access token, refresh token, and expiry. Refresh preserves the previous refresh token when Google does not return a replacement.

### Service Account

The service-account method accepts a Google service account JSON key, validates `client_email` and `private_key`, signs an RS256 JWT assertion for the Compute scope, and exchanges it at Google's OAuth token endpoint for a short-lived access token. Refresh regenerates the assertion and the verified credentials provide the connection profile.

## Scope Clauses

- Read tools: any of `compute.readonly`, `compute`, or `cloud-platform`.
- Write tools: either `compute` or `cloud-platform`.

Compute Engine v1 does not accept `cloud-platform.read-only`, so the integration neither offers it in OAuth consent nor accepts it in any scope clause; a connection must grant one of the scopes listed above.

## Tool Contract

| Tool key | API collection or method | Access |
|---|---|---|
| `create_instance` | `instances.insert` | Write |
| `delete_instance` | `instances.delete` | Destructive write |
| `start_instance` | `instances.start` | Write |
| `stop_instance` | `instances.stop` | Destructive write |
| `reset_instance` | `instances.reset` | Destructive write |
| `set_instance_machine_type` | `instances.setMachineType` | Write |
| `get_instance_basic_info` | `instances.get` | Read |
| `list_instances` | `instances.list` | Read |
| `list_instance_attached_disks` | `instances.get` disk projection | Read |
| `get_disk_basic_info` | `disks.get` basic projection | Read |
| `get_disk_performance_config` | `disks.get` performance projection | Read |
| `list_disks` | `disks.list` | Read |
| `list_snapshots` | `snapshots.list` | Read |
| `list_images` | `images.list` | Read |
| `list_machine_types` | `machineTypes.list` | Read |
| `list_accelerator_types` | `acceleratorTypes.list` | Read |
| `get_instance_group_manager_basic_info` | `instanceGroupManagers.get` | Read |
| `list_instance_group_managers` | `instanceGroupManagers.list` | Read |
| `list_managed_instances` | `instanceGroupManagers.listManagedInstances` | Read |
| `get_instance_template_basic_info` | `instanceTemplates.get` basic projection | Read |
| `get_instance_template_properties` | `instanceTemplates.get` properties projection | Read |
| `list_instance_templates` | `instanceTemplates.list` | Read |
| `get_reservation_basic_info` | `reservations.get` basic projection | Read |
| `get_reservation_details` | `reservations.get` detailed projection | Read |
| `list_reservations` | `reservations.list` | Read |
| `get_commitment_basic_info` | `regionCommitments.get` | Read |
| `list_commitments` | `regionCommitments.list` | Read |
| `list_commitment_reservations` | `regionCommitments.get` reservation projection | Read |
| `get_zone_operation` | `zoneOperations.get` | Read |

Every production ID is formed as `compute-engine-<tool-key>` and remains under 60 characters. There are no triggers.

## VM Creation and Lifecycle

`create_instance` defaults to the `e2-medium` machine type and the `debian-cloud` `debian-12` image family. It creates a boot disk with automatic deletion and attaches the default network. Optional accelerators are normalized to zonal resource paths. If accelerators are present, scheduling uses `onHostMaintenance=TERMINATE` regardless of the supplied maintenance preference.

`set_instance_machine_type` calls `instances.setMachineType`; callers must stop the VM first. `stop_instance`, `reset_instance`, and `delete_instance` are tagged destructive. `start_instance`, `create_instance`, and `set_instance_machine_type` are writes but not tagged destructive.

## Operation Polling

Every VM mutation returns:

- `operationName`: the zonal operation name;
- `status`: the status returned by the initial mutation call.

The result message directs callers to `get_zone_operation`. Poll that tool with the mutation's zone and `operationName` until `status` is `DONE`. The polling output includes operation progress, target, timestamps, warnings, structured errors, and HTTP failure details. A completed operation with errors is a failed mutation and must not be treated as success.

## Read Projections and Pagination

Basic-info tools deliberately project stable identity and lifecycle fields instead of returning unbounded provider payloads. Detailed template, reservation, attached-disk, and operation tools preserve richer documented structures where downstream inspection needs them. Every list tool that maps to a plain Compute Engine list endpoint — including `list_machine_types`, `list_accelerator_types`, and `list_managed_instances` — accepts `pageSize` and `pageToken`, fetches a single provider page per call, and exposes its returned collection plus `nextPageToken`. These list tools also accept an optional `filter` input passed through verbatim as the Compute Engine `filter` query parameter (for example `status = RUNNING` or `name eq '^web-.*'`).

### Image Listing

When `imageProject` is provided, `list_images` lists that single project and supports `pageToken` pagination. When `imageProject` is omitted, the tool aggregates the configured project plus the standard public image projects (`debian-cloud`, `ubuntu-os-cloud`, `rocky-linux-cloud`, `centos-cloud`, `cos-cloud`, `rhel-cloud`, `suse-cloud`, `windows-cloud`, `fedora-coreos-cloud`, `opensuse-cloud`); each image is tagged with its `sourceProject`, `pageSize` applies per source project, and no `nextPageToken` is returned. Passing `pageToken` without an explicit `imageProject` is rejected with a user-facing `ServiceError`.

## HTTP and Error Contract

`ComputeEngineClient` targets `https://compute.googleapis.com/compute/v1/`, applies bearer authentication and JSON headers once, builds encoded project-relative paths, and routes requests through the Compute Engine `ServiceError` adapter. User-facing validation, missing location state, and provider failures never escape as raw `Error` instances from integration business logic.

## Live E2E Constraints

The private suite requires a selected profile with a valid token plus `projectId`, `defaultZone`, and `defaultRegion`. The project must have the Compute Engine API enabled. Safe list/catalog scenarios run without resource fixtures; resource-specific reads require explicitly named stable fixtures.

VM write scenarios are fixture-gated with `enableWriteScenarios=false` by default. Enabling them asserts that the project has billing, VM quota, required write scopes, and permission to create/delete disposable VMs in `defaultZone`. Each enabled scenario creates its own ephemeral VM, polls every operation, and registers idempotent cleanup.
