# Pilvio Integration Specification

Pilvio provides cloud compute, block and object storage, and networking APIs.
The official [API reference](https://api.pilvio.com/) defines this integration's request routes and resource mappings.

## Authentication and scope

API tokens are created in the [Pilvio dashboard](https://app.pilvio.com/) and sent in the `apikey` header. Authentication reads `/user-resource/user`; profile email and names are nested under `profile_data`. The read-only `get_current_user` tool exposes the same user identity and full response.

`locationSlug` is an optional datacenter selection. Discover valid slugs with `list_platform_config` (`locations`). Location-specific compute, disks, private networks, floating IPs, firewalls, and load balancers use `/v1/{slug}/...`. Without a slug Pilvio selects the default location. Inventories must be requested separately for each location. User, billing, and S3 management APIs are global.

`list_billing_accounts` calls `/payment/billing_account/list` and exposes stable account IDs, titles, status, credit, and unpaid amounts. Resource creation accepts an account ID; some endpoints allow omission with a token restricted to one account.

## Tools

- `get_current_user`: current user and nested profile information.
- `list_billing_accounts`: authorized billing account discovery.
- `list_vms`, `get_vm`, `create_vm`, `manage_vm`, `delete_vm`: VM discovery, creation, lifecycle, cloning, reinstall, backups, password changes, and one-time ISO boot.
- `manage_snapshots`: list, create, delete, and restore VM replicas. Snapshot creation includes the complete disk response so returned replica identifiers remain available.
- `manage_block_storage`: standalone disk lifecycle, attach/detach, create an attached disk, resize an attached disk, delete an attached data disk, and filter/set read-only bootable media.
- `manage_object_storage`, `manage_s3_keys`: bucket management, S3 endpoint discovery, and S3 credentials. Object contents use the S3 API separately.
- `manage_networks`: list, get, create, rename, select default, and delete private networks.
- `manage_floating_ips`: address lifecycle and VM assignment using `assigned_to` and `assigned_to_resource_type`.
- `manage_firewalls`: create, list, update, delete, and VM assignments. Public protocol values remain uppercase and are translated to provider lowercase values. Legacy `endpointSpec` remains a string (a single prefix or a JSON array); additive `endpointPrefixes` supports multiple IP/CIDR values. Existing rule UUIDs can be supplied when updating rules.
- `manage_load_balancers`: list, get, create, rename, delete, manage VM targets and forwarding rules, and reassign billing. Requests use `display_name`, `rules`, and `targets`; forwarding-rule and target removal use their documented UUID paths.
- `list_platform_config`: datacenter locations, host pools, plain OS images, app catalog images, bootable ISO media, all VM images, and VM creation constraints.

## Response mapping and validation

VM input RAM remains MB and maps to the provider `ram` parameter; VM response RAM comes from `memory` (with a `ram` fallback for existing responses). Attached disk sizes come from `size`, standalone disk sizes from `size_gb`. CPU remains a count and ports remain numbers. Runtime validation rejects fractional CPU/RAM/disk-size inputs and invalid firewall/load-balancer ports without narrowing existing number schemas. Current resource limits are discoverable through `vm_parameters` rather than hardcoded from example documentation.

Nullable optional values such as firewall ports and unassigned floating-IP targets are omitted from their normalized fields. Additive raw resource fields preserve the original provider response, including identifiers and metadata not covered by normalized fields. Existing keys, output types, and raw image/media output fields are retained. HTTP errors and provider `errors` envelopes are translated into user-facing service failures. Unexpected list responses fail instead of reporting empty successful inventories.

The API documents forms for legacy VM/storage operations, repeated `public_keys` form parameters, and JSON for networking and SSH-key mutations. The client uses those documented formats and encodes path identifiers.

## Provider constraints and limits

- CPU and RAM changes require a stopped VM; password changes require a running VM.
- Disk resizing only grows storage; primary boot disks cannot be deleted through attached-disk deletion.
- Non-empty buckets and default/non-empty networks cannot be deleted.
- Firewall rules use ports 1–65535, ordered ranges, and IP/CIDR arrays for prefix filtering. Omitted ports map to provider null values for all ports.
- The existing `sessionPersistence` and `connectionLimit` create inputs remain available and retain their legacy top-level payload fields. The API reference shows these values in returned forwarding-rule settings but does not document them in the creation request; their application is unverified.
- No payment execution, invoice-management, token-management, or profile-update tools are exposed. The integration does not claim those capabilities.
- The API reference does not document webhooks; no triggers are registered.

## Verification scope

The refresh uses official documentation, static schema checks, and a package build. No authenticated provider calls, live E2E, or tool-use evals are included.
