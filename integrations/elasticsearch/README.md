# <img src="https://provider-logos.metorial-cdn.com/elasticsearch.svg" height="20"> Elasticsearch

Index, search, and analyze documents in Elasticsearch clusters. Create and manage indices, aliases, and composable index templates with custom mappings and settings. Perform full-text search, structured queries, aggregations, async search using Query DSL, and ES|QL queries. Manage ingest pipelines to transform data before indexing. Run machine learning inference tasks including text embedding, sparse embedding, reranking, completion, and chat completion. Monitor cluster health, node stats, and manage snapshots for backups. Manage security including users, roles, API keys, and privileges. Explore graph relationships between terms. Set up Watcher alerts that poll data and trigger actions like emails or webhooks based on conditions.

## Tools

### Bulk Operations

Perform multiple index, create, update, or delete operations in a single API call. Much more efficient than individual requests when processing many documents.

### Cluster Health

Get the health status and key metrics of the Elasticsearch cluster including node count, shard allocation status, and pending tasks. Optionally include node-level statistics.

### Delete Document

Remove a document from an Elasticsearch index by its ID. Returns the result of the deletion operation.

### ES|QL Query

Execute an ES|QL query to filter, transform, and analyze data stored in Elasticsearch. ES|QL provides a pipe-based query language for powerful data exploration and manipulation.

### Get Document

Retrieve one or more documents by ID from an Elasticsearch index. Supports fetching a single document or multiple documents across indices using multi-get.

### Graph Explore

Discover relationships between terms in an Elasticsearch index. The graph explore API extracts and summarizes connections in your data, helping identify significant co-occurrences and related terms.

### Index Document

Create or replace a document in an Elasticsearch index. Provide JSON document content and optionally specify a document ID. If no ID is provided, Elasticsearch will auto-generate one. If an ID is provided and a document already exists with that ID, it will be replaced.

### List Indices

List all indices in the Elasticsearch cluster with their health status, document count, and storage size. Can also retrieve detailed information about a specific index including its mappings, settings, and aliases.

### Manage Alias

Create, delete, or list index aliases. Aliases provide alternative names for indices or groups of indices, enabling seamless index switching and multi-index queries.

### Manage Async Search

Submit, retrieve, or delete an Elasticsearch asynchronous search. Use this for long-running Query DSL searches when partial results are useful or when results should be retrieved later by ID.

### Manage Index

Create, configure, open, close, or delete an Elasticsearch index. Supports setting mappings, settings, aliases, and number of replicas/shards during creation. Can also update mappings and settings on existing indices.

### Manage Index Template

Create, retrieve, list, or delete Elasticsearch composable index templates. Index templates define settings, mappings, and aliases that apply automatically when matching indices or data streams are created.

### Manage Ingest Pipeline

Create, update, delete, list, or simulate ingest pipelines. Pipelines consist of processors that transform and enrich documents before they are indexed. Use simulate to test a pipeline against sample documents.

### Manage Security

Manage Elasticsearch security resources including users, roles, and API keys. Create, update, delete, and list users and roles for role-based access control. Create and invalidate API keys.

### Manage Snapshot

Create, restore, delete, or retrieve snapshots and snapshot repositories for cluster backups. Snapshots allow you to back up indices and cluster state for disaster recovery.

### Manage Watch

Create, update, delete, execute, activate, or deactivate Watcher alerts. Watches monitor data changes by running scheduled queries and triggering actions (email, webhook, index, logging) when conditions are met.

### Reindex

Copy documents from one index to another, optionally applying a query filter or transformations via a script. Useful for migrating data between indices, changing mappings, or applying pipeline processing to existing data.

### Run Inference

Execute a machine learning inference task using a configured inference endpoint. Supports text embedding, sparse embedding, reranking, completion, and chat completion tasks. Can also list, create, update, or delete inference endpoints.

### Search Documents

Search and query documents in Elasticsearch using the full Query DSL. Supports full-text search, term-level queries, compound queries, aggregations, sorting, pagination, and source filtering. Can target a specific index or search across all indices.

### Update Document

Partially update an existing document in an Elasticsearch index. Supports partial document updates (merge fields) or script-based updates for more complex modifications. Unlike indexing, this only modifies specified fields without replacing the entire document.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
