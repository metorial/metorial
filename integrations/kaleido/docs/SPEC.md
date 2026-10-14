# Kaleido Specification

The integration uses the administrative [Kaleido platform API](https://api.kaleido.io/platform.html) with a Bearer API key and a selected deployment region. Runtime application credentials are separate from the administrative API key. The [API tutorial](https://docs.kaleido.io/developers/automation/api-101/) documents API-key setup and one-time application credential passwords.

## Tools

| Tool | Behavior |
| --- | --- |
| `list_organizations` | Discover organization identity and subscription metadata. |
| `list_consortia` / `manage_consortium` | Discover and manage consortia. |
| `manage_environment` | Manage blockchain environments; the `besu` choice maps to API protocol `pantheon`. |
| `manage_membership` | Manage consortium memberships. |
| `manage_node` | Manage nodes and submit lifecycle requests. `role` controls initial consensus participation during creation. |
| `get_node_status` | Inspect runtime status and optionally retrieve component logs. |
| `manage_service` | Manage membership-owned services. |
| `manage_app_credential` | Manage runtime credentials; creation exposes the one-time password. |
| `manage_invitation` | Invite organizations and list or delete invitations. |
| `get_audit_logs` | Retrieve organization or consortium audit history and select a local result window. |
| `manage_contract_project` | Discover and manage GitHub or precompiled Solidity projects. |
| `manage_compiled_contract` | Manage versions under a contract project and promote them to an environment. |

## Discovery and contract workflow

Call `list_consortia`, then the list actions of `manage_environment` and `manage_membership` to discover resource IDs. Contract versions require `contractProjectId`; the existing `contractId` field continues to identify the compiled version. Create requires an owning membership and a description. GitHub projects use `contractUrl`; precompiled projects use an ABI array or JSON string plus bytecode. Raw Solidity text is not accepted by the platform compilation endpoint.

The consortium creation API does not accept the legacy `mode` field. Node updates accept name and size; initial consensus participation belongs to creation. Node start and stop are documented for PoA/IBFT environments. Provisioning and deletion requests may be accepted before their lifecycle transition completes.
