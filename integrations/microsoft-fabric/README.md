# <img src="https://provider-logos.metorial-cdn.com/microsoft-fabric.svg" height="20"> Microsoft Fabric

Manage Microsoft Fabric items and Data Factory workloads, access OneLake files and table metadata, and download compact Fabric API reference resources.

- Fabric Core: discover workspaces and items, create/read/update/delete items, inspect long-running operations, and inspect or cancel item jobs.
- Data Factory: list, create, inspect and run Data Pipelines; list and create Dataflows; execute Dataflow queries and download Arrow results.
- OneLake: browse paths, transfer files, manage directories, and inspect Iceberg catalog namespaces and tables.
- Documentation: workload references, API specifications, item definitions, best practices and examples.

Authentication uses Microsoft Entra delegated OAuth with separate Fabric API and Azure Storage audience tokens. The connected application needs Fabric delegated permissions and Azure Storage delegated consent. Token refresh retains the latest returned refresh token and falls back to the existing token when none is returned.

Start with `core_list_workspaces`, then `core_list_items`, to discover stable resource IDs. These tools use Fabric REST and the Fabric token. Existing `onelake_list_workspaces` and `onelake_list_items` retain their OneLake routes and Storage token for compatibility with saved environments.

For Iceberg catalog calls, use `onelake_get_table_config` first and pass its `overrides.prefix` as `catalogPrefix` when needed. Omitting the optional prefix preserves the existing workspace/item path.

Creation and query execution may return HTTP 202. Use `core_get_operation_state` with the returned operation ID, or `core_get_item_job` with a pipeline job instance ID from its Location URL. Respect `Retry-After`; acceptance does not mean the operation has finished. Job cancellation is also asynchronous.

File tools prepare downloadable results. OneLake download metadata reflects an actual content retrieval; a prepared download still requires subsequent delivery to succeed. Production endpoints are used by default; existing endpoint overrides and tenant fallback behavior are preserved.
