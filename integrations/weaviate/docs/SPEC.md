# Weaviate integration specification

## Connection and authentication

Set `instanceUrl` to the Weaviate instance's HTTP or HTTPS REST endpoint.
Connect with an API key, a pre-issued OIDC bearer token, or anonymous access
when the server permits it. API keys and OIDC tokens use the standard
`Authorization: Bearer` header. OIDC bearer tokens must be replaced through
reconnection when they expire; this integration does not exchange or refresh
OIDC tokens. No resource IDs are required at connection setup.

`get_current_user` discovers the authenticated username, assigned roles and
groups on servers supporting `/v1/users/own-info`.

## Capability coverage

| Workflow | Tools |
| --- | --- |
| Collection discovery and schema CRUD | `list_collections`, `get_collection`, `create_collection`, `update_collection`, `delete_collection` |
| Individual object CRUD | `create_object`, `get_object`, `update_object`, `delete_object` |
| Object browsing and pagination | `list_objects` |
| Bulk import and filtered deletion | `batch_create_objects`, `batch_delete_objects` |
| Semantic, vector, similar-object, hybrid and keyword search | `search_objects` |
| Retrieval augmented generation | `generative_search` |
| Count, statistics and grouping | `aggregate_collection` |
| Tenant discovery and lifecycle | `manage_tenants` |
| Object relationships | `manage_references` |
| Backup creation, restore and status | `manage_backup` |
| Instance health, modules and nodes | `cluster_status` |
| Current identity | `get_current_user` |

Collections can use a single vector configuration or named `vectorConfig`
entries. Named configurations must not be combined with the legacy top-level
vectorizer/index fields. Object creation, import and updates accept named
`vectors`. Nested `object`/`object[]` property definitions use
`nestedProperties`. A vectorizer cannot be changed after collection creation.
Generative and reranker configuration is mutable on supported server versions,
but this integration's collection update tool exposes description, inverted
index configuration and new properties. Changing a replication factor requires
Weaviate replica movement, not a schema update.

Object updates merge properties by default; `replaceAll=true` replaces the
complete property set. Both modes accept vector updates. Tenant-scoped object
operations use the selected tenant. Reference and batch-deletion endpoints
receive their tenant as a query parameter.

`list_objects` supports limit/offset or the `after` UUID cursor and exposes
`nextCursor`. Cursor pagination cannot be combined with offset or sorting.
An empty page means traversal is complete. Batch deletion processes at most
the server's configured maximum; repeat the operation if more objects match.
Dry runs never remove objects. Bulk import reports individual failures.

## Search availability and limitations

`search_objects` requires exactly one of `nearText`, `nearVector`,
`nearObject`, `hybrid`, or `bm25`. Distance and certainty are mutually exclusive;
certainty requires a cosine index. Vector search does not request certainty
unless the caller asks for it, so non-cosine indexes work. `targetVector`
selects the named vector on applicable searches.

GraphQL result properties accept field selections, including nested objects
such as `address { city }` and references such as
`author { ... on Author { name } }`. REST result properties select
non-reference properties.

GraphQL is the default search API and must be enabled on the server. Set
`api=rest` to use the experimental REST Search endpoints, which require
Weaviate 1.39 or newer and are enabled by default from 1.39.7. REST hybrid
search cannot accept a custom vector, and REST search does not return vector
embeddings; use `get_object` to retrieve embeddings. REST generation and
reranking remain reserved and are not advertised as supported.

New Weaviate Cloud clusters may have GraphQL disabled. Aggregation and
`generative_search` currently require GraphQL. Text search needs a configured
vectorizer; RAG additionally requires a generative module and model credentials
configured on the server. No model API keys are accepted by this integration.

Backups require an enabled and configured backend. Include and exclude lists
are mutually exclusive. Restore can overwrite data and should target a safe
instance. Only active tenants are included in backups. New tenants can be
ACTIVE or INACTIVE; OFFLOADED is an update operation requiring server support.
Tenant additions and updates default to ACTIVE when the status is omitted.

## Events

No triggers are exposed.
The current official database API contains no webhook subscription or native
change-event endpoint.

## Official references

- https://docs.weaviate.io/openapi.json
- https://docs.weaviate.io/weaviate/api
- https://docs.weaviate.io/weaviate/api/graphql
- https://docs.weaviate.io/weaviate/api/graphql/search-operators
- https://docs.weaviate.io/weaviate/api/graphql/filters
- https://docs.weaviate.io/weaviate/api/graphql/aggregate
- https://docs.weaviate.io/weaviate/manage-objects/update
- https://docs.weaviate.io/weaviate/manage-collections/collection-operations
- https://docs.weaviate.io/weaviate/manage-collections/generative-reranker-models
- https://docs.weaviate.io/deploy/configuration/authentication
