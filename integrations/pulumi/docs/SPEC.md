# Pulumi integration API specification

The integration exposes 20 tools for Pulumi Cloud. It uses the public [Cloud REST API](https://www.pulumi.com/docs/reference/cloud-rest-api/) and its [published OpenAPI specification](https://api.pulumi.com/api/openapi/pulumi-spec.json).

## Connection

Authenticate with an access token using `Authorization: token <access-token>`. API requests use `Accept: application/vnd.pulumi+8`; ESC definition downloads use `application/x-yaml`. The API origin defaults to `https://api.pulumi.com` and is stored with the credential. Self-hosted origins must use HTTPS and contain no path, query, fragment or embedded credentials. Existing connections can retain their stored API-origin configuration as a compatibility fallback.

The token is verified against `GET /api/user`. `get_current_user` returns identity and organization memberships. Organization-scoped tools accept an organization login and can use the optional configured default. Personal, organization and team tokens remain subject to their provider permissions and product entitlements.

## Supported workflows

| Workflow | Public tools | Provider API |
| --- | --- | --- |
| Identity | `get_current_user` | `GET /api/user` |
| Stacks | `list_stacks`, `get_stack`, `create_stack`, `delete_stack` | `/api/user/stacks`, `/api/stacks/{organization}/{project}/{stack}` and project stack collection |
| Tags and history | `manage_stack_tags`, `list_stack_updates` | Stack `/tags`, `/updates` |
| Deployments | `trigger_deployment`, `get_deployment`, `list_deployments`, `cancel_deployment` | Stack `/deployments`, deployment `/logs`, `/cancel`; organization `/deployments` |
| ESC | `list_environments`, `manage_environment`, `open_environment` | `/api/esc/environments/{organization}`, full environment path and `/open` session paths |
| Resource search | `search_resources` | `GET /api/orgs/{organization}/search/resourcesv2` |
| Organization reads | `list_org_members`, `list_policy_packs`, `list_audit_logs` | Organization `/members`, `/policypacks`, `/auditlogs` |
| Credentials | `manage_access_tokens` | `/api/user/tokens` and token item paths |
| Webhooks | `manage_webhooks` | Organization or stack `/hooks` |

## Results and lifecycle behavior

Stack outputs come from the dedicated outputs endpoint. Secret values remain in their provider-stored encrypted representation. Stack deletion removes the stack record; it does not run an infrastructure destroy. Forced deletion can discard state.

Deployment creation confirms acceptance and returns the provider deployment ID, version and optional console URL. Read the deployment to inspect its current status. Supported operations are update, preview, refresh and destroy. They use the stack's saved settings unless inheritance is disabled. Cancellation is a request, not confirmation of a terminal state. Deployment logs follow provider continuation tokens. A deployment's operation comes from the current `pulumiOperation` field, with older `operation` responses accepted for compatibility.

ESC creation posts the project and environment name to the organization collection. Reading returns a downloadable YAML definition and useful file metadata. The legacy optional `yamlContent` output remains in the schema but is no longer populated. Updating sends the entire YAML definition; error or unknown-severity diagnostics fail explicitly, while warning-only HTTP 200 responses retain their confirmed success. Diagnostic text is omitted because it can contain definition values. Opening creates an evaluation session and can reveal secrets or mint dynamic credentials.

Stack, environment, member and credential collections follow cursor pagination by default, up to 100 pages. Explicit cursor or result-limit inputs request one page. Deployment lists use page numbers starting at 1 and page sizes from 1 to 100. Their status filter is local to the fetched page; the provider total is unfiltered. Search exposes provider pagination metadata without following arbitrary returned URLs. The current search API accepts the same exposed parameters and response shape as its deprecated predecessor. Page-based search is limited to 10,000 results; larger cursor searches require Enterprise access and pagination is not transactional. Audit-log pagination remains explicit and plan-gated.

Token lists return metadata only, including credential kind when available; Pulumi can include refresh-token metadata as well as personal tokens. Token creation returns the new personal-token secret once. Webhook results omit shared-secret material. Creating an inactive webhook prevents deliveries; enabled webhooks can contact the configured receiver.

The client rejects unsafe origins and relative resource-path segments, validates responses, preserves upstream error status and validated retry hints, enforces a 30-second timeout and does not follow redirects. Error parents contain safe status metadata rather than raw HTTP request/response objects. Stack update history accepts the documented nonnegative page/pageSize values; page 0 retrieves all history.

## Official references

- [REST API and authentication](https://www.pulumi.com/docs/reference/cloud-rest-api/)
- [Users](https://www.pulumi.com/docs/reference/cloud-rest-api/users/)
- [Stacks](https://www.pulumi.com/docs/reference/cloud-rest-api/stacks/)
- [Stack updates](https://www.pulumi.com/docs/reference/cloud-rest-api/stack-updates/)
- [Deployments](https://www.pulumi.com/docs/reference/cloud-rest-api/deployments/)
- [ESC environments](https://www.pulumi.com/docs/reference/cloud-rest-api/environments/)
- [Resource search](https://www.pulumi.com/docs/reference/cloud-rest-api/resource-search/)
- [Organizations](https://www.pulumi.com/docs/reference/cloud-rest-api/organizations/)
- [Access tokens](https://www.pulumi.com/docs/reference/cloud-rest-api/access-tokens/)
