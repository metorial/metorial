# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Compute Engine

Connect a Google Cloud project to the Compute Engine API for virtual machine, disk, image, machine type, accelerator, managed instance group, template, reservation, commitment, and operation workflows.

## Configuration

- **Project ID** (`projectId`) is required and scopes every Compute Engine API request.
- **Default zone** (`defaultZone`) is optional. Zonal tools use their `zone` input first and then this value.
- **Default region** (`defaultRegion`) is optional. Regional commitment tools use their `region` input first and then this value.

Calls to zonal or regional tools fail with a user-facing validation error when neither a per-call location nor its configured default is available.

## Authentication

Authenticate with Google OAuth 2.0 or a Google Cloud service account JSON key.

- Read tools accept the Compute Read Only, Compute, or Cloud Platform scope.
- Write tools require the Compute or Cloud Platform scope.
- OAuth preserves refresh tokens for offline access and uses profile/email scopes to identify the connection.
- Service-account credentials sign a Compute-scoped JWT assertion and exchange it for a short-lived Google access token.

## Tools

| Tool | Access | Purpose |
|---|---|---|
| `create_instance` | Write | Create a VM with documented machine/image defaults and optional accelerators. |
| `delete_instance` | Destructive write | Delete a VM. |
| `start_instance` | Write | Start a stopped VM. |
| `stop_instance` | Destructive write | Stop a running VM. |
| `reset_instance` | Destructive write | Hard-reset a VM. |
| `set_instance_machine_type` | Write | Change the machine type of a stopped VM. |
| `get_instance_basic_info` | Read | Get VM identity, state, machine type, creation time, and accelerators. |
| `list_instances` | Read | List VMs in a zone. |
| `list_instance_attached_disks` | Read | List complete attached-disk configurations for a VM. |
| `get_disk_basic_info` | Read | Get disk identity, size, type, state, and attachment timestamps. |
| `get_disk_performance_config` | Read | Get disk IOPS, throughput, block size, storage pool, and access mode. |
| `list_disks` | Read | List disks in a zone. |
| `list_snapshots` | Read | List global snapshots in the configured project. |
| `list_images` | Read | List images from one project, or aggregate the configured project plus the standard public image projects by default. |
| `list_machine_types` | Read | List machine types in a zone. |
| `list_accelerator_types` | Read | List accelerator types in a zone. |
| `get_instance_group_manager_basic_info` | Read | Get managed instance group identity, target sizes, template, and status. |
| `list_instance_group_managers` | Read | List managed instance groups in a zone. |
| `list_managed_instances` | Read | List instances and current actions in a managed instance group. |
| `get_instance_template_basic_info` | Read | Get global instance-template identity and machine type. |
| `get_instance_template_properties` | Read | Get full instance-template properties. |
| `list_instance_templates` | Read | List global instance templates. |
| `get_reservation_basic_info` | Read | Get reservation identity, status, and commitment links. |
| `get_reservation_details` | Read | Get detailed reservation shape, sharing, and resource status. |
| `list_reservations` | Read | List reservations in a zone. |
| `get_commitment_basic_info` | Read | Get a regional commitment's term, type, resources, and status. |
| `list_commitments` | Read | List commitments in a region. |
| `list_commitment_reservations` | Read | List reservations attached to a commitment. |
| `get_zone_operation` | Read | Poll a zonal operation and inspect progress, warnings, and failures. |

## Asynchronous Operations

VM mutations return `operationName` and `status` before the change necessarily completes. Poll `get_zone_operation` with the same zone and returned operation name until `status` is `DONE`. Treat populated operation errors or HTTP failure fields as a failed mutation; a `DONE` status alone does not guarantee success.

Changing a machine type requires the VM to be stopped. Creating a VM with guest accelerators forces `onHostMaintenance=TERMINATE`, because accelerator-backed VMs cannot live migrate.

## Live E2E Setup

The private live suite requires a profile with `projectId`, `defaultZone`, and `defaultRegion`, plus Compute Engine API access. Stable fixture names unlock read-only `get_*` scenarios. Write scenarios are disabled unless `enableWriteScenarios` is explicitly set; enabling them requires project billing, VM quota, and permission to create and delete ephemeral VMs in `defaultZone`.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
