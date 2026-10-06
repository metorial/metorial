# Xata API capabilities

## Product boundary

The [provider-owned Xata Lite SDK repository](https://github.com/xataio/client-ts) confirms permanent retirement on February 28, 2026. The original 24 integration tools use that retired workspace/data API. Their keys, input/output schemas and handler logic remain for compatibility, with deprecation tags and instructions; both Lite transport constructors reject before creating a client or sending a credential. The historical OAuth key and scope remain registered with explicit retirement guidance, and every OAuth stage rejects locally.

The current [Xata platform](https://xata.io/docs/overview) is branch-native PostgreSQL. Its management API uses `https://api.xata.tech` and current Bearer API keys. Current tools have separate keys and ID-based organization/project/branch contracts. Retired workspace or database names are not silently interpreted as current IDs.

## Current authentication

Use a current API key from the console. [API-key scopes](https://xata.io/docs/platform/api-key) control organization/project/branch read and write access and can restrict projects/branches. User API keys also inherit their creator's organization role. Connection identity is derived from the accessible organization collection through `org:read`; this is organization-access identity, not an invented user-email lookup. The API publishes no equivalent current `/user` endpoint.

## Eight current tools

| Tool | Route / effect |
| --- | --- |
| `list_organizations` | GET `/organizations`; complete accessible collection, requires `org:read` |
| `list_projects` | GET `/organizations/{organizationID}/projects`; complete accessible collection, requires `project:read` |
| `get_project` | GET `/organizations/{organizationID}/projects/{projectID}`; project metadata and scale-to-zero defaults |
| `list_project_branches` | GET `/organizations/{organizationID}/projects/{projectID}/branches`; complete accessible collection, requires `branch:read` |
| `get_project_branch` | GET `/organizations/{organizationID}/projects/{projectID}/branches/{branchID}`; current branch status and safe configuration |
| `create_project_branch` | POST branch collection with `mode=inherit` and explicit `parentID`; allocates billable resources and inherits parent data/configuration |
| `update_project_branch` | PATCH branch detail for name/description, manual hibernation or automatic scale-to-zero; waking can incur compute charges |
| `delete_project_branch` | DELETE branch detail; requires `branch:write`, permanently deletes unique data, successful API response is 204 |

An optional configured `organizationId` can supply the organization for current tools. Legacy configuration fields remain for compatibility. Current lists have no documented pagination or cursor parameters; their counts describe returned records. Single-resource IDs and typed provider envelopes are validated. Safe branch metadata excludes the deprecated credential-bearing `connectionString`, credential objects and arbitrary PostgreSQL configuration strings.

Branch creation and compute changes return acknowledgement metadata, not a completed-operation assertion. Use branch detail to inspect health/provisioning. Manual hibernation and automatic scale-to-zero cannot be enabled simultaneously. Update scale-to-zero using the paired enabled/idle-period fields, and provide at least one field for an update. Description validation follows the published current API character/length contract.

## Deliberate limits

The current SQL/HTTP gateway authenticates with a PostgreSQL `Connection-String`, not the management Bearer key. Native SQL/record/schema/transaction work, branch credential retrieval/rotation, project/organization provisioning or deletion, billing changes, replicas/storage/image changes, imports, files, replication and external automation are not exposed. No triggers or replacement webhook groups are registered.

## Official sources

- [Current API reference and origin](https://xata.io/docs/api-reference)
- [Current OpenAPI document](https://api.xata.tech/openapi.json)
- [API keys and roles](https://xata.io/docs/platform/api-key)
- [Projects](https://xata.io/docs/platform/project)
- [Branches and deletion](https://xata.io/docs/platform/branch)
- [Scale to zero and hibernation](https://xata.io/docs/core-concepts/scale-to-zero)
- [Serverless gateway authentication](https://xata.io/docs/core-concepts/serverless-proxy)
- [Provider-owned Lite retirement notice](https://github.com/xataio/client-ts)
