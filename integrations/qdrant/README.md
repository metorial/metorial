# <img src="https://provider-logos.metorial-cdn.com/qdrant-logo.svg" height="20"> Qdrant

Manage Qdrant collections, vectors, payloads, and backups. Create dense, named-vector, or sparse collections, update indexing settings, write and retrieve points, and run similarity, recommendation, discovery, and hybrid queries. Manage payload indexes and collection aliases, and create downloadable snapshots or recover a collection from a snapshot.

Database tools require a database API key and the cluster endpoint in connection settings. Cloud tools require a separate Cloud Management Key. Use `list_accounts` to discover account IDs and `list_cloud_options` to discover providers, regions, and packages before creating a cloud cluster.

## Tools

| Workflow | Tools |
| --- | --- |
| Collections | `list_collections`, `get_collection`, `create_collection`, `update_collection`, `delete_collection` |
| Point data | `upsert_points`, `get_points`, `delete_points`, `scroll_points`, `count_points` |
| Vector queries | `search_points`, `recommend_points`, `discover_points` |
| Payloads and aliases | `manage_payload`, `manage_payload_index`, `manage_aliases` |
| Snapshots | `manage_snapshots` supports create, list, download, delete, and recover |
| Cloud management | `list_accounts`, `list_cloud_options`, `manage_clusters` |

`scroll_points` returns a continuation offset. Cloud cluster listing accepts `pageSize` and `pageToken` and returns `nextPageToken` when another page exists. Search accepts Qdrant query and prefetch objects for advanced and hybrid retrieval.

Collection snapshots contain data for the node that handles the request. Distributed deployments should use the appropriate node endpoint. Full storage snapshots require a single-node deployment and are unavailable on Qdrant Cloud. Snapshot recovery overwrites data in the target collection.

No event triggers are provided.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
