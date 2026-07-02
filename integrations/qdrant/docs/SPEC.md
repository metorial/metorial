# Slates Specification for Qdrant

## Overview

Qdrant is an open-source vector database and semantic search engine written in Rust. It provides a production-ready service with a convenient API to store, search, and manage points—vectors with an additional payload. It makes it useful for all sorts of neural-network or semantic-based matching, faceted search, and other applications.

## Authentication

Qdrant supports two distinct APIs with separate authentication mechanisms:

### Database API (Vector Operations)

The Database API handles all vector/collection operations and is accessed via your cluster's endpoint URL (e.g., `https://xyz-example.qdrant.io:6333`).

**API Key Authentication:**
Qdrant supports a simple form of client authentication using a static API key. Qdrant offers API key-based authentication, including both regular API keys and read-only API keys. Regular API keys grant full access to read, write, and delete operations, while read-only keys restrict access to data retrieval operations only, preventing write actions.

The API key is passed via the `api-key` header or as a Bearer token in the `Authorization` header:

- Header: `api-key: <YOUR_API_KEY>`
- Bearer: `Authorization: Bearer <YOUR_API_KEY>`

Database API keys can be configured with granular access control. On Qdrant Cloud, you can create API keys using the Cloud Dashboard, allowing you to generate API keys that give you access to a single node or cluster, or multiple clusters.

**JWT-based Authentication (Advanced):**
For more complex cases, Qdrant supports granular access control with JSON Web Tokens (JWT). This allows you to create tokens which restrict access to data stored in your cluster, and build Role-based access control (RBAC) on top of that. In this way, you can define permissions for users and restrict access to sensitive endpoints. To use JWT-based authentication, you need to provide it as a bearer token in the Authorization header, or as a key in the Api-Key header of your requests. JWTs are signed using the configured API key.

### Cloud Management API (Infrastructure Operations)

The Cloud Management API manages clusters, backups, and account-level resources at `https://api.cloud.qdrant.io`.

Most of the Qdrant Cloud API requests must be authenticated. Authentication is handled via API keys (so called management keys), which should be passed in the Authorization header. Management Keys: `Authorization: apikey <YOUR_MANAGEMENT_KEY>`. You can create a management key in the Cloud Console UI. Go to Access Management > Cloud Management Keys.

## Features

### Collection Management

Create and manage collections that store vector data. Each collection is configured with vector parameters including dimensionality and distance metric (cosine, dot product, Euclidean). Collections support multiple named vector spaces for representing different features or modalities (e.g., image, text, video). You need to create separate named vector spaces in the collection, define them during creation, and manage them independently. Each vector should have a unique name and can use different embedding models. Collections also support aliases for versioning or A/B testing.

### Point (Vector) Operations

Store, update, retrieve, and delete points (vectors with optional JSON payloads). Qdrant can attach any JSON payloads to vectors, allowing for both the storage and filtering of data based on the values in these payloads. Points can be upserted individually or in batches. You can retrieve points by ID or scroll through the entire collection.

### Vector Search

Perform similarity search by providing a query vector and retrieving the top-K closest matches. Payload supports a wide range of data types and query conditions, including keyword matching, full-text filtering, numerical ranges, geo-locations, and more. Filtering conditions can be combined in various ways, including should, must, and must_not clauses. Qdrant supports sparse vectors in addition to regular dense ones. Sparse vectors can be viewed as a generalization of BM25 or TF-IDF ranking, enabling you to harness the capabilities of transformer-based neural networks to weigh individual tokens effectively.

- A universal query API covers all capabilities of search, recommend, discover, and filters, and also enables hybrid and multi-stage queries.
- Results can be grouped by a payload field, e.g., grouping chunks by document ID for per-document search.
- Random sampling is available for debugging and data exploration.

### Recommendation

Qdrant allows you to search based on multiple positive and negative examples. The examples can be point IDs or raw vectors. Two scoring strategies are available: `average_vector` (averages all examples into a single query) and `best_score` (evaluates each candidate against all examples and takes the best score). Useful for building recommendation systems, outlier detection, and data exploration.

### Discovery Search

Retrieves the most similar points to a given target, constrained by provided context. Context Search: When only the context is provided (without a target), pairs of points are used to generate a loss that guides the search towards the area where most positive examples overlap. Context pairs of positive/negative examples partition the vector space, enabling controlled exploration beyond simple nearest-neighbor search.

### Payload Indexing and Filtering

The payload index is a helper data structure that enables effective filtering on a particular payload attribute, similar to indexes in relational databases. A unique aspect of the payload index is that it extends the HNSW graph, allowing filtering criteria to be applied during the semantic search phase.

### Snapshots and Backups

Snapshots are tar archive files that contain data and configuration of a specific collection on a specific node at a specific time. In a distributed setup, you must create snapshots for each node separately. This feature can be used to archive data or easily replicate an existing deployment. Snapshots can be created, listed, downloaded, deleted, and used to recover collections. Recovery supports configurable conflict resolution priority (snapshot vs. replica).

### Cloud Cluster Management (Cloud API)

The API allows you to manage clusters, backup schedules, and perform other operations available to your account. This includes creating/scaling clusters, managing API keys, configuring hybrid cloud environments, and accessing monitoring data such as metrics and logs.

### Built-in Inference

Inference is the process of creating vector embeddings from text, images, or other data types using a machine learning model. You can use inference in the API wherever you can use regular vectors. This is available on Qdrant Cloud and supports models like BM25 for sparse vectors directly within upsert and query operations.

## Events

The provider does not support events. Qdrant does not offer webhooks, event subscriptions, or purpose-built polling mechanisms for change notifications.
