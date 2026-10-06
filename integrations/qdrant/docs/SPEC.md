# Qdrant Integration Specification

## Authentication and connection settings

The database API accepts the database key in the `api-key` header. Set `clusterEndpoint` to the cluster or node HTTP endpoint. Database and Cloud Management keys are separate credentials; either authentication method can include both keys. A connection with only a management key can use cloud tools, and a connection with only a database key can use database tools.

The cloud API uses `Authorization: apikey <management-key>` at `https://api.cloud.qdrant.io`. `list_accounts` returns accessible accounts. Pass a selected `accountId` to cloud tools; it can be omitted when the key has access to one account. Stored account settings from older connections are retained as a compatibility fallback. New connections do not require an opaque account ID in connection settings.

Cloud user profile endpoints require a user actor and do not accept management-key actors, so no current-user tool is exposed for these authentication methods. The database API has no user identity endpoint.

## Capabilities

| Area | Supported behavior |
| --- | --- |
| Collections | List, inspect, create, update indexing/optimization/vector/replication settings, delete |
| Vectors | Batch upsert, retrieve by point ID, delete by IDs or filter, exact/approximate count, cursor scrolling |
| Queries | Universal query API for dense/sparse/hybrid similarity search, recommendation, target discovery, and context exploration |
| Payloads | Merge, nested merge, overwrite, delete keys, clear, create/delete field indexes |
| Aliases | List, create, rename, delete |
| Snapshots | Collection/full-storage create, list, download, delete; collection recovery from URI with checksum and optional remote API key |
| Cloud | Discover accounts/providers/regions/packages; list/get/create/delete/restart/suspend/unsuspend clusters |

Point mutation selectors require exactly one of point IDs or a filter. Collection creation accepts one dense vector configuration, named dense configurations, or sparse configurations; dense and sparse configurations can be combined. Recommendation and discovery use the universal query endpoint rather than the removed standalone routes.

Snapshot creation with `wait: false` can finish in the background without immediate metadata. List snapshots afterward to discover the generated name. Completed creation and download operations provide downloadable files. Full-storage snapshots do not work on Qdrant Cloud or distributed deployments. Collection snapshots are node-specific in distributed deployments.

Cloud create parameters are discoverable via `list_cloud_options`. Cloud listing uses the provider's `items` response and pagination token. Cluster details unwrap the `cluster` response and return a REST endpoint URL with the documented port.

## Events

No event triggers are provided. The previous generic inbound webhook was removed; it had no provider event contract or authenticated registration mechanism.

## Official sources

- [Database API reference](https://api.qdrant.tech/)
- [Security and access control](https://qdrant.tech/documentation/operations/security/)
- [Universal query API](https://api.qdrant.tech/api-reference/search/query-points)
- [Snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Cloud API](https://qdrant.tech/documentation/cloud-api/)
- [Cloud API definitions](https://github.com/qdrant/qdrant-cloud-public-api)
