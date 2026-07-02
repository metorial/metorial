# <img src="https://provider-logos.metorial-cdn.com/qdrant-logo.svg" height="20"> Qdrant

Store, search, and manage vectors with JSON payloads in a vector database. Create and configure collections with custom vector parameters, distance metrics, and multiple named vector spaces. Upsert, retrieve, and delete points (vectors) individually or in batches. Perform similarity search, filtered search, hybrid search, and multi-stage queries using dense or sparse vectors. Build recommendation systems using positive/negative examples with configurable scoring strategies. Run discovery searches constrained by context pairs. Filter results by payload fields including keyword matching, full-text search, numerical ranges, and geo-locations. Group search results by payload field. Create, list, download, and delete collection snapshots for backup and recovery. Manage cloud clusters, API keys, backup schedules, and hybrid cloud environments. Generate vector embeddings via built-in inference for text and other data types.

## Tools

### Count Points

Counts the number of points in a collection, optionally filtered by payload conditions. Supports both exact and approximate counting modes.

### Create Collection

Creates a new Qdrant collection with specified vector parameters. Supports single unnamed vectors or multiple named vector spaces for multi-modal data (e.g., text + image embeddings). Configure distance metric, dimensionality, and optional HNSW/quantization settings.

### Delete Collection

Permanently deletes a Qdrant collection and all its data. This action cannot be undone.

### Delete Points

Deletes points from a collection by IDs or by a filter condition. Use IDs for targeted deletion or filters for bulk removal based on payload conditions.

### Discover Points

Finds points similar to a target constrained by a context of positive/negative example pairs. Context pairs partition the vector space, guiding the search toward regions where positive examples overlap. Without a target, performs pure context-based exploration. Useful for controlled exploration beyond simple nearest-neighbor search.

### Get Collection Info

Retrieves detailed information about a specific Qdrant collection, including its status, vector configuration, point count, indexed vectors count, and payload schema. Useful for inspecting collection health and configuration.

### Get Points

Retrieves specific points by their IDs from a collection. Returns the point payload and optionally the vector data. Use this to look up known points by ID.

### List Collections

Lists all collections in the Qdrant cluster. Returns the name of each collection. Use this to discover available collections before performing operations on them.

### Manage Collection Aliases

Creates, deletes, or renames collection aliases. Aliases provide alternative names for collections, useful for versioning or A/B testing. Multiple alias operations can be performed atomically in a single call. Can also list existing aliases.

### Manage Cloud Clusters

Manages Qdrant Cloud clusters. List, get details, create, delete, restart, suspend, or unsuspend clusters. Requires a Cloud Management API key and account ID in the configuration.

### Manage Payload Index

Creates or deletes payload field indexes on a collection. Indexes improve filter performance during search. Supported field types: \

### Manage Payload

Sets, overwrites, deletes, or clears payload data on points. Supports targeting points by IDs or filter conditions. Use **set** to merge new payload fields, **overwrite** to replace the entire payload, **deleteKeys** to remove specific keys, or **clear** to remove all payload data.

### Manage Snapshots

Creates, lists, deletes, or recovers collection snapshots. Snapshots are tar archive files containing collection data and configuration. Use them for backups, data archiving, or replicating deployments. Supports both collection-level and full storage snapshots.

### Recommend Points

Finds similar points based on positive and negative examples. Positive examples define what you're looking for; negative examples define what to avoid. Examples can be point IDs or raw vectors. Supports two strategies: \

### Scroll Points

Iterates through points in a collection with pagination. Supports filtering by payload conditions. Returns points along with a pagination offset for fetching the next page. Useful for browsing, exporting, or processing all points in a collection.

### Search Points

Performs vector similarity search using the universal query API. Finds the closest points to a query vector, with optional filtering, score thresholds, and support for named vector spaces. This is the primary search mechanism for semantic/neural search.

### Upsert Points

Inserts or updates points (vectors with optional JSON payloads) in a collection. Supports batch operations. Each point requires an ID (integer or UUID string) and a vector. Payloads can include any JSON data for filtering and retrieval.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
