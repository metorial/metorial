# <img src="https://provider-logos.metorial-cdn.com/weaviate.png" height="20"> Weaviate

Store, search, and manage data objects with vector embeddings in an AI-native vector database. Create and configure collections with vectorizers and generative modules. Import objects individually or in batches with automatic or custom vector embeddings. Perform semantic (vector) search, hybrid search combining vector and keyword (BM25) matching, and filtered queries. Execute retrieval augmented generation (RAG) using integrated LLMs. Aggregate data across collections for statistical metrics. Manage multi-tenant data isolation, create and restore backups, and discover the authenticated user identity. Monitor cluster health and node status.

Use an API key, a pre-issued OIDC bearer token (reconnect when it expires), or anonymous access if permitted by the server. Set the instance REST URL at connection setup.

Search defaults to GraphQL. On clusters with GraphQL disabled, select `api=rest` for experimental REST search (Weaviate 1.39+, enabled by default from 1.39.7). RAG and aggregation require GraphQL. Named vectors and nested object properties are supported. No event triggers are exposed.

See [the capability specification](docs/SPEC.md) for provider requirements and limitations.

## Tools

### Aggregate Collection

Run aggregation queries over a collection to compute metrics like counts, sums, averages, min/max, top occurrences, and more. Supports grouping by a property and filtering with a where clause. Provide a GraphQL metric selection and optional aggregation filters.

### Batch Create Objects

Import multiple objects into one or more collections in a single batch request. Optionally include pre-computed vectors for each object. Supports multi-tenant collections.

### Batch Delete Objects

Delete multiple objects from a collection that match a given where filter. Supports dry-run mode to preview which objects would be deleted without actually removing them.

### Cluster Status

Get comprehensive information about the Weaviate instance including version, module list, cluster health, and node statuses with shard and object counts.

### Create Collection

Create a new collection (class) in Weaviate with its schema definition. Configure properties, vectorizer, generative module, vector index settings, and multi-tenancy. The vectorizer cannot be changed after creation. Generative configuration is mutable on supported server versions.

### Create Object

Create a new data object in a Weaviate collection. Optionally provide a pre-computed vector embedding, or let the configured vectorizer generate one automatically. Supports multi-tenant collections by specifying the tenant name.

### Delete Collection

Permanently delete a collection and all its objects from the Weaviate instance. This action cannot be undone.

### Delete Object

Delete a specific object from a collection by its UUID. This permanently removes the object and its vector embedding.

### Generative Search (RAG)

Search a collection and generate text using a configured generative module. Supports per-object prompt templates and a grouped task over the results. Requires GraphQL, a text vectorizer and server-side model credentials.

### Get Current User

Get the authenticated username, assigned roles and groups on supported servers.

### Get Collection

Retrieve the full schema definition of a specific collection, including its properties, vectorizer configuration, module settings, vector index type, and multi-tenancy configuration.

### Get Object

Retrieve a specific object from a collection by its UUID. Optionally include vector embeddings in the response.

### List Collections

List all collections (classes) in the Weaviate instance. Returns each collection's name, description, properties, vectorizer, and configuration.

### List Objects

List objects from a collection using the REST API. Supports pagination via limit/offset or cursor-based pagination. Use this for simple object retrieval without search ranking; for search use the **Search Objects** tool instead.

### Manage Backup

Create, restore, or check the status of a Weaviate backup. Supports S3, GCS, Azure, and filesystem backends. - **create**: Start a new backup of all or selected collections. - **restore**: Restore a previously created backup. - **status**: Check the status of a backup or restore operation.

### Manage Cross-References

Add or remove cross-references between objects across collections. Cross-references create links between objects, enabling graph-like data traversal.

### Manage Tenants

Manage tenants in a multi-tenant collection. Supports listing, adding, updating status, and removing tenants. Each tenant provides data isolation with its own shard. Tenant statuses: **ACTIVE** (available), **INACTIVE** (stored locally but not loaded), **OFFLOADED** (moved to cold storage).

### Search Objects

Search for objects in a Weaviate collection using various search methods: - **nearText**: Semantic search using natural language concepts (requires a text vectorizer) - **nearVector**: Search by raw vector similarity - **nearObject**: Find objects similar to an existing object - **hybrid**: Combined vector + keyword search with configurable weighting - **bm25**: Pure keyword search using BM25 ranking Exactly one search method must be provided. Results can be filtered with a where clause and paginated with limit/offset.

### Update Collection

Update an existing collection's settings or add new properties. You can update the description, inverted index config, replication config, and add new properties. The vectorizer cannot be changed and properties cannot be removed. Replication factor changes require replica movement.

### Update Object

Update an existing object's properties in a collection. Use **replaceAll** mode to replace all properties (PUT), or **patch** mode to merge only the provided properties (PATCH).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
