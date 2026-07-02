# Microsoft Fabric Integration Spec

## Identity

- Package: `@slates-integrations/microsoft-fabric`
- Integration name: `@microsoft/fabric`
- Auth: Work Only Microsoft Entra delegated OAuth

## OAuth

- Authorize URL: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize`
- Token URL: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
- Default tenant: `organizations`
- Fabric scopes:
  - `https://api.fabric.microsoft.com/Workspace.ReadWrite.All`
  - `https://api.fabric.microsoft.com/Item.ReadWrite.All`
  - `https://api.fabric.microsoft.com/Item.Execute.All`
  - `offline_access`
- OneLake token audience:
  - `https://storage.azure.com/.default`

The callback first redeems the authorization code for Fabric scopes, then redeems the refresh token for the Storage audience. Tools fail with a `ServiceError` when Storage consent is unavailable because OneLake data-plane calls cannot use a Fabric-audience token.

## Create Item Contract

`core_create_item` follows the Fabric Create Item request body:

- `displayName` and `itemType` are required.
- `description`, `folderId`, and `sensitivityLabelSettings` are optional.
- `definition` and `creationPayload` are optional but mutually exclusive. Supplying both returns a `ServiceError`.

Data Pipeline and Dataflow create tools support `definition`, `description`, `folderId`, and `sensitivityLabelSettings`.

Data Pipeline and Dataflow list tools support `continuationToken`, `recursive`,
and `rootFolderId` query parameters. `datafactory_run_pipeline` uses the Fabric
item job scheduler endpoint
`/workspaces/{workspaceId}/items/{pipelineId}/jobs/{jobType}/instances`,
defaults `jobType` to `DefaultJob`, and supports optional `executionData` plus
per-run `parameters`.

## Tool Surface

Docs:

- `docs_workloads`
- `docs_workload_api_spec`
- `docs_platform_api_spec`
- `docs_item_definitions`
- `docs_best_practices`
- `docs_api_examples`

Docs tools return compact vendored JSON attachments with operation specs, request fields, response status/LRO metadata, scopes, examples, and Microsoft source URLs.

OneLake:

- `onelake_list_workspaces`
- `onelake_list_items`
- `onelake_list_items_dfs`
- `onelake_list_files`
- `onelake_download_file`
- `onelake_upload_file`
- `onelake_delete_file`
- `onelake_create_directory`
- `onelake_delete_directory`
- `onelake_get_table_config`
- `onelake_list_table_namespaces`
- `onelake_get_table_namespace`
- `onelake_list_tables`
- `onelake_get_table`

Core and Data Factory:

- `core_create_item`
- `datafactory_list_pipelines`
- `datafactory_create_pipeline`
- `datafactory_get_pipeline`
- `datafactory_run_pipeline`
- `datafactory_list_dataflows`
- `datafactory_create_dataflow`
- `datafactory_execute_query`

## Endpoint Families

- Fabric REST: `https://api.fabric.microsoft.com/v1`
- OneLake API: `https://api.onelake.fabric.microsoft.com`
- OneLake DFS: `https://onelake.dfs.fabric.microsoft.com`
- OneLake Blob: `https://onelake.blob.fabric.microsoft.com`
- OneLake Table: `https://onelake.table.fabric.microsoft.com`

## Sources

- Fabric REST API: `https://learn.microsoft.com/en-us/rest/api/fabric/articles/`
- Fabric scopes: `https://learn.microsoft.com/en-us/rest/api/fabric/articles/scopes`
- Create item: `https://learn.microsoft.com/en-us/rest/api/fabric/core/items/create-item`
- OneLake access APIs: `https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api`
- Data Pipeline list: `https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/list-data-pipelines`
- Data Pipeline create: `https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/create-data-pipeline`
- Run on-demand item job: `https://learn.microsoft.com/en-us/rest/api/fabric/core/job-scheduler/run-on-demand-item-job`
- Dataflow list: `https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/items/list-dataflows`
- Dataflow execute query: `https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/query-execution/execute-query`
