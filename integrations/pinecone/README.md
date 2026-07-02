# <img src="https://provider-logos.metorial-cdn.com/pinecone-logo.svg" height="20"> Pinecone

Manage Pinecone vector database indexes and records for AI applications. Create and configure serverless, BYOC, integrated-embedding, and legacy pod indexes. Upsert, search, fetch, update, list, and delete vectors with metadata filtering and namespace partitioning. Work with integrated-embedding text records, hosted embedding/reranking models, and Pinecone Assistants with files, context retrieval, and grounded chat.

## Tools

### Chat with Assistant

Ask questions to a Pinecone Assistant and receive context-aware answers grounded in uploaded files, with citations and optional retrieval controls.

### Configure Index

Describe, update, or delete an existing Pinecone index. Update deletion protection, tags, legacy pod replicas, or integrated embedding field/read/write parameters.

### Create Index

Create a new Pinecone vector index. Supports serverless indexes, BYOC environments, and legacy pod-based indexes. Configure dense or sparse vector type, dimension, metric, deletion protection, tags, and serverless read capacity.

### Create Integrated Index

Create a serverless index with integrated embedding so source text records can be upserted and searched without generating vectors outside Pinecone.

### Delete Vectors

Remove vectors from a Pinecone index. Delete specific vectors by ID, delete by metadata filter, or delete all vectors in a namespace. Useful for cleaning up data, removing outdated records, or clearing entire namespaces.

### Fetch Records by Metadata

Fetch complete vector records from a namespace by metadata filter when you do not know their record IDs.

### Index Stats

Get statistics about a Pinecone index including total vector count, vector count per namespace, dimension, fullness, and metric. Use this to monitor index usage and capacity.

### Fetch Vectors

Retrieve specific vectors by their IDs from a Pinecone index. Returns the full vector data including values, sparse values, and metadata. Use this when you know the exact vector IDs you want to look up.

### Generate Embeddings

Generate vector embeddings from text using Pinecone's hosted embedding models. Returns dense or sparse vectors that can be stored in an index or used for search.

### Get Assistant Context

Retrieve context snippets from a Pinecone Assistant without generating an answer. Use this for RAG workflows that pass retrieved snippets to another model or agent.

### List Indexes

List all vector indexes in the current Pinecone project. Returns index names, dimensions, metrics, hosting details, and operational status. Use this to discover available indexes before performing vector operations.

### List Vector IDs

List vector IDs in a Pinecone serverless index with optional namespace and prefix filtering. Returns paginated results. Use this to discover vector IDs before fetching or deleting specific vectors.

### Manage Assistant

Create, list, describe, update, or delete Pinecone Assistants. Assistants provide RAG-based Q&A powered by uploaded files.

### Manage Assistant Files

List, upload, upsert, describe, or delete files in a Pinecone Assistant, and inspect asynchronous assistant file operations.

### Manage Namespaces

Create, list, describe, or delete namespaces in a Pinecone serverless index. Namespaces partition records for multitenancy and targeted search.

### Query Vectors

Search for the most similar vectors in a Pinecone index. Query by providing a dense vector or an existing vector ID. Results include similarity scores and optionally the vector values and metadata. Supports metadata filtering and sparse vectors for hybrid search.

### Rerank

Rerank a list of documents by relevance to a query using Pinecone's hosted reranking models.

### Search Records

Search a namespace with text, a vector, or a record ID. Supports integrated-embedding text search and optional reranking.

### Update Vector

Update an existing vector's values, sparse values, or metadata in a Pinecone index. Use this to modify a single vector without needing to re-upsert the entire record.

### Upsert Text Records

Upsert text records into a Pinecone integrated-embedding index. Pinecone converts the configured text field to vectors automatically and stores other fields as metadata.

### Upsert Vectors

Insert or update vector records in a Pinecone index. Each vector has a unique ID and dense/sparse embedding values with optional metadata. If a vector with the same ID already exists, it will be overwritten. Supports batch upsert of up to 1000 vectors.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
