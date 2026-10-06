# <img src="https://provider-logos.metorial-cdn.com/pulumi.png" height="20"> Pulumi

Manage Pulumi Cloud stacks, deployment operations, ESC environments, personal access tokens and webhooks. Discover account identity and organizations, inspect update history and deployment logs, search cloud resources, and read policy packs, organization members and audit logs.

Connect with a Pulumi personal, organization or team access token. The managed service uses `https://api.pulumi.com`; a self-hosted connection can supply its HTTPS API origin when authenticating. Use `get_current_user` to discover organization logins, then pass the chosen organization to scoped tools. An optional default organization remains available.

## Tools

| Tool | Outcome |
| --- | --- |
| `get_current_user` | Read the authenticated identity, organization memberships and machine-token context. |
| `list_stacks` | List accessible stacks with organization, project or tag filters and cursor pagination. |
| `get_stack` | Inspect a stack and optionally fetch its recorded outputs; secret values remain encrypted. |
| `create_stack` | Create an empty stack under an organization and project. |
| `delete_stack` | Delete a stack record. Forced deletion can discard state and does not destroy cloud resources. |
| `manage_stack_tags` | Set, update or delete stack tags, including empty tag values. |
| `list_stack_updates` | Read update history with optional page and page-size controls. |
| `trigger_deployment` | Start update, preview, refresh or destroy using saved deployment settings. |
| `get_deployment` | Read deployment details and optionally its paginated log stream. |
| `list_deployments` | Read a stack or organization deployment page. Optional status filtering applies to that page; totals cover all statuses. |
| `cancel_deployment` | Request cancellation of a deployment; inspect its status to confirm completion. |
| `list_environments` | List ESC environments with cursor pagination. |
| `manage_environment` | Create, download, replace or delete an ESC YAML definition. |
| `open_environment` | Create an ESC session and resolve values or a selected property, including secrets and dynamic credentials. |
| `search_resources` | Search organization resources with query syntax, optional properties and pagination. |
| `list_org_members` | Read organization members and roles with cursor pagination. |
| `list_policy_packs` | Read organization policy-pack metadata. |
| `list_audit_logs` | Read a page of audit events with time, user and event filters, subject to organization entitlement. |
| `manage_access_tokens` | List credential metadata, create a personal access token or revoke a token. A created secret is returned only once. |
| `manage_webhooks` | List, create or delete organization or stack webhooks; creation can disable deliveries. |

ESC reads provide a downloadable YAML file. Updates replace the full definition. Opening an environment creates a session and may execute dynamic providers or mint credentials; it is a write operation. Deployment operations execute configured programs and can change infrastructure or incur charges. Use explicit authorization and controlled stacks for deployment, cancellation and deletion workflows.

Cursor listings retrieve all pages by default where supported, with a bounded page limit. Supplying a continuation token or maximum result count requests one page. Returned counts describe the fetched results; totals are included only when supplied by Pulumi. Resource search uses the current `resourcesv2` API. Page-based search supports up to 10,000 results; larger cursor searches require Enterprise access and ordering can change during updates.

See the [API specification](docs/SPEC.md) and [official Pulumi REST API documentation](https://www.pulumi.com/docs/reference/cloud-rest-api/) for authentication, permissions and provider limitations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
