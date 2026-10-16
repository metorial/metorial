# Turbot Pipes integration

Use an API token from your developer account's Advanced > Credentials & Access settings. For an enterprise tenant, set its full API base URL during authentication. Tokens authenticate requests using the Bearer scheme; this integration does not use OAuth.

The integration provides 29 tools for current-user identification, accessible organization and workspace discovery, workspace and connection management, organization membership management, SQL queries, scheduled pipelines, process monitoring, snapshot metadata, and SQL schema/table discovery.

For an organization resource, provide its owner handle from `list_organizations`. Use `list_workspaces` to discover workspace handles, `list_connections` for connection handles, `list_pipelines` for scheduled pipeline IDs, and `list_workspace_schemas` followed by `list_workspace_tables` for queryable table and column names.

Lists return one page and a continuation cursor when supplied by the provider. Page limits must be whole numbers from 1 through 100. Pipeline and snapshot lists accept Pipes query-filter expressions. The documented table-list route has no pagination inputs, so a provider cursor returned there is informational.

Queries return the provider's result rows with their original column names and values. The full provider query response is also available. Scheduled pipeline commands return the provider's process reference; use the process tools to inspect later progress. Snapshot tools return metadata.

Adding organization members through this integration uses the existing-tenant-user endpoint, available for custom tenants. It does not send email invitations. Datatanks, tenant administration, billing, notification configuration, Flowpipe mod management and file exports are outside this tool set.

Provider references:

- [REST API reference](https://turbot.com/pipes/docs/reference/api)
- [OpenAPI definition](https://pipes.turbot.com/api/latest/docs/openapi.json)
- [Query API](https://turbot.com/pipes/docs/develop/query-api)
- [Query filters](https://turbot.com/pipes/docs/reference/query-filter)
