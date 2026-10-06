# Airbyte public data replication API

## Authentication and product boundaries

Use application client credentials from Airbyte User settings > Applications. Exchange JSON at `POST /applications/token` with `client_id`, `client_secret` and `grant-type: client_credentials`. Send the returned token as Bearer auth. Token renewal repeats this grant using the original application credentials; token expiry uses the actual `expires_in`. Official pages describe differing historical lifetimes, so no fixed lifetime is assumed.

Cloud base URL: `https://api.airbyte.com/v1`. Self-managed public API: `<YOUR_AIRBYTE_URL>/api/public/v1`; feature availability depends on the deployed version/edition. HTTP is supported for documented local self-managed deployments. Redirects are not followed. The old Configuration API `/api/v1` and the agent/context APIs are outside this integration. Base URL belongs to authentication. An old stored config URL is only a fallback when auth has none. Workspace IDs belong to individual tool inputs and are discovered with `list_workspaces`.

## Tools and contracts

35 tools retain all 31 original keys. Four additions inspect one workspace and discover organizations/source definitions/destination definitions. Source/destination CRUD uses the public actor routes. Built-in connector types go inside `configuration`; custom connectors use top-level `definitionId`. Patch configuration updates preserve omitted provider settings. Returned configurations mask credential fields.

Connections link discovered source/destination IDs. Creation defaults are supplied by Airbyte unless explicitly provided. Manual/cron inputs retain their original shapes; cron requires an expression. Stream replacement supports namespaces and selected fields as well as the provider's current sync modes. A stream update replaces the full set. The legacy connection `dataResidency` result is an empty string if the provider does not report it; inspect workspace residency separately.

Job tools create sync/reset jobs, read/list them and request cancellation. Job IDs must be positive safe integers. Job filters include current queued states and read-only refresh/clear job types; execution remains limited to the original sync/reset modes. Reset can clear destination data. Cancellation does not promise an immediately terminal state.

Workspace CRUD uses current notification event keys with `email.enabled` and `webhook.enabled`/`url`. Tags support partial caller updates by reading the existing tag and submitting the required name/color pair. Permissions retain original role enum entries and add runner roles; public `instance_admin` requests fail with a supported-role remediation. Workspace and organization scopes are mutually exclusive. Creation/get permission responses are translated into the original `scope`/`scopeId` outputs.

List sources/destinations/connections/jobs/workspaces use integer limit/offset pagination. Workspace ID arrays use repeated query parameters. Lists retain `hasMore`; callers advance offset by limit. Permissions, tags and organization/definition discovery follow their documented collection contracts. IDs are encoded and malformed/empty inputs rejected. Unexpected provider collections or response objects fail before mapping. HTTP failures retain status and useful provider detail while configured auth and submitted configuration strings are protected from error echoes.

## Public API sources

- https://docs.airbyte.com/platform/using-airbyte/configuring-api-access
- https://reference.airbyte.com/reference/authentication
- https://reference.airbyte.com/reference/createaccesstoken
- https://reference.airbyte.com/reference/createsource
- https://reference.airbyte.com/reference/patchsource
- https://reference.airbyte.com/reference/patchdestination
- https://reference.airbyte.com/reference/createconnection
- https://github.com/airbytehq/airbyte-platform/blob/de86574e8bba126b60cfe9c5cb27d153e2b2ef36/airbyte-api/server-api/src/main/openapi/api_sdk.yaml

## Deliberate exclusions

No account identity endpoint is invented: the public API has organization/user collections, but no suitable current-user endpoint. Custom definition management, embedded templates, connector OAuth flows, admin application/token mutation and agent/context tools are not included. No file export/download tool or webhook/polling registration is exposed.
