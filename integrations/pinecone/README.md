# <img src="https://provider-logos.metorial-cdn.com/pinecone-logo.svg" height="20"> Pinecone

Manage vector database indexes and perform vector operations for AI applications. Create, configure, and delete serverless or pod-based indexes. Upsert, query, fetch, update, and delete vector embeddings with metadata filtering and namespace partitioning. Generate embeddings and rerank results using hosted inference models. Upload documents and chat with an AI assistant for RAG-based Q&A with citations. Bulk import data from cloud storage, create backups and collections, and manage organizational resources like projects, API keys, and service accounts.

## Tools

### Chat with Assistant

Ask questions to a Pinecone Assistant and receive context-aware answers grounded in uploaded documents, with inline citations. Supports multi-turn conversations, metadata-based document filtering, and LLM model selection (GPT-4o or Claude 3.5 Sonnet).

### Configure Index

Update the configuration of an existing Pinecone index. Modify deletion protection, tags, and pod-based index settings like replicas. Can also be used to describe or delete an index.

### Create Index

Create a new Pinecone vector index. Supports serverless indexes (auto-scaling, specify cloud and region) and pod-based indexes (dedicated resources, specify environment and pod type). Configure dimension, distance metric, vector type, and optional deletion protection.

### Delete Vectors

Remove vectors from a Pinecone index. Delete specific vectors by ID, delete by metadata filter, or delete all vectors in a namespace. Useful for cleaning up data, removing outdated records, or clearing entire namespaces.

### Index Stats

Get statistics about a Pinecone index including total vector count, vector count per namespace, dimension, fullness, and metric. Use this to monitor index usage and capacity.

### Fetch Vectors

Retrieve specific vectors by their IDs from a Pinecone index. Returns the full vector data including values, sparse values, and metadata. Use this when you know the exact vector IDs you want to look up.

### Generate Embeddings

Generate vector embeddings from text using Pinecone's hosted embedding models. Returns dense or sparse vectors that can be stored in an index or used for queries. Available models include \

### List Indexes

List all vector indexes in the current Pinecone project. Returns index names, dimensions, metrics, hosting details, and operational status. Use this to discover available indexes before performing vector operations.

### List Vector IDs

List vector IDs in a Pinecone serverless index with optional namespace and prefix filtering. Returns paginated results. Use this to discover vector IDs before fetching or deleting specific vectors.

### Manage Assistant

Create, list, describe, or delete Pinecone Assistants. Assistants provide RAG-based document Q&A powered by uploaded documents. Can be deployed in US or EU regions.

### Query Vectors

Search for the most similar vectors in a Pinecone index. Query by providing a dense vector or an existing vector ID. Results include similarity scores and optionally the vector values and metadata. Supports metadata filtering and sparse vectors for hybrid search.

### Rerank

Rerank a list of documents by relevance to a query using Pinecone's hosted reranking models (e.g. \

### Update Vector

Update an existing vector's values, sparse values, or metadata in a Pinecone index. Use this to modify a single vector without needing to re-upsert the entire record.

### Upsert Vectors

Insert or update vector records in a Pinecone index. Each vector has a unique ID and dense/sparse embedding values with optional metadata. If a vector with the same ID already exists, it will be overwritten. Supports batch upsert of up to 1000 vectors.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
