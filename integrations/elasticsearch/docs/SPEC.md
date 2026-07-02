# Slates Specification for Elasticsearch

## Overview

Elasticsearch is a distributed, RESTful search and analytics engine built on Apache Lucene. It provides full-text search, structured search, analytics, and data storage capabilities through a comprehensive REST API. It also includes machine learning inference capabilities and cluster management features.

## Authentication

Elasticsearch supports three primary authentication methods:

### 1. Basic Authentication

Basic authentication is the simplest method of authentication. It involves sending a username and password with each request. The credentials are sent via the standard HTTP `Authorization: Basic <base64-encoded credentials>` header. The Elasticsearch security features work with standard HTTP basic authentication headers to authenticate users. Since Elasticsearch is stateless, this header must be sent with every request.

**Required inputs:**

- **Elasticsearch URL**: The base URL of your Elasticsearch cluster (e.g., `https://my-cluster.es.cloud:9243`)
- **Username**: An Elasticsearch user account
- **Password**: The user's password

### 2. API Key Authentication

Elasticsearch APIs support key-based authentication. You must create an API key and use the encoded value in the request header.

API keys are created via `POST /_security/api_key`. An array of role descriptors can be specified for the API key. When it is not specified or it is an empty array, the API key will have a point in time snapshot of permissions of the authenticated user. If you supply role descriptors, the resultant permissions are an intersection of API keys permissions and the authenticated user's permissions thereby limiting the access scope for API keys.

The key is passed via the header: `Authorization: ApiKey <encoded-key>`.

**Required inputs:**

- **Elasticsearch URL**: The base URL of your Elasticsearch cluster
- **API Key** (base64-encoded): The `encoded` value returned when the API key was created

An expiration time can be set for the API key. By default, API keys never expire.

### 3. Bearer Token Authentication

The `POST _security/oauth2/token` endpoint can be used to obtain a token. You will need to provide your username and password in the request, using a `grant_type` of `password`. The token is passed via `Authorization: Bearer <token>`.

**Required inputs:**

- **Elasticsearch URL**: The base URL of your Elasticsearch cluster
- **Access Token**: Obtained from the OAuth2 token endpoint

When the token service is enabled, you must also enable HTTPS by setting `xpack.security.http.ssl.enabled` to `true`.

## Features

### Document Management

The Document APIs are used for handling documents in Elasticsearch. Using these APIs, you can create documents in an index, update them, move them to another index, or remove them. Documents are JSON objects stored in indices and retrieved by ID or through search queries.

### Search and Querying

You can use the search API to search and aggregate data stored in Elasticsearch data streams or indices. The API's query request body parameter accepts queries written in Query DSL. Features include:

- Full-text search, term-level queries, compound queries, and fuzzy matching
- Async search for long-running queries across large data sets or multiple clusters. An async search lets you retrieve partial results for a long-running search now and get complete results later.
- ES|QL provides a powerful way to filter, transform, and analyze data stored in Elasticsearch.
- Aggregations for analytics (metrics, bucketing, pipeline aggregations)

### Index Management

The index APIs enable you to manage individual indices, index settings, aliases, mappings, and index templates.

- Create, delete, open/close indices
- Define mappings and field types
- Configure index settings and aliases
- Create, retrieve, list, and delete composable index templates
- The index lifecycle management APIs enable you to set up policies to automatically manage the index lifecycle.
- The data stream APIs enable you to create and manage data streams and data stream lifecycles.

### Cluster Monitoring and Management

Cluster-specific API calls allow you to manage and monitor your Elasticsearch cluster. Most of the APIs allow you to define which Elasticsearch node to call using either the internal node ID, its name, or its address.

- Health checks, node stats, and cluster settings
- Snapshot and restore for backups
- Cross-cluster replication (CCR) enables you to replicate indices across clusters to continue handling search requests in the event of a datacenter outage, prevent search volume from impacting indexing throughput, and reduce search latency.

### Ingest Pipelines

Elasticsearch provides ingest pipelines that allow you to pre-process documents before indexing. Pipelines consist of processors that can transform, enrich, and filter data during ingestion.

### Machine Learning and Inference

The inference API enables you to use machine learning models to perform specific tasks on data that you provide as an input. It returns a response with the results of the tasks. The inference endpoint you use can perform one specific task that has been defined when the endpoint was created.

- Supported task types include: sparse_embedding, text_embedding, rerank, completion, chat_completion, or embedding.
- Integrations available with built-in models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
- Anomaly detection jobs, data frame analytics (classification, regression, outlier detection)

### Security Management

The security APIs allow managing users, roles, role mappings, API keys, and privileges. This includes role-based access control (RBAC) with granular index-level and cluster-level permissions.

### Graph Exploration

The graph explore APIs enable you to extract and summarize information about the documents and terms in an Elasticsearch data stream or index. This helps discover relationships between terms in your data.

## Events

Elasticsearch does not support inbound webhooks or event subscription mechanisms in the traditional sense. However, it provides **Watcher** (alerting), which is a built-in polling-based mechanism for monitoring data changes and triggering actions:

### Watcher (Alerting)

The alerting features provide an API for creating, managing and testing watches. A watch describes a single alert and can contain multiple notification actions. A watch is constructed from four simple building blocks: a schedule for running a query and checking the condition.

Each watch consists of:

- **Trigger**: A schedule (interval, cron, etc.) that defines when the watch runs.
- **Input**: The query to run as input to the condition. Watches support the full Elasticsearch query language, including aggregations.
- **Condition**: A condition that determines whether or not to execute the actions. You can use simple conditions (always true), or use scripting for more sophisticated scenarios.
- **Actions**: One or more actions, such as sending email, pushing data to 3rd party systems through a webhook, or indexing the results of the query.

The webhook action can send a request to any web service. The webhook action supports both HTTP and HTTPS connections. This allows Elasticsearch to notify external systems when data conditions are met.

Watcher is a purpose-built polling mechanism — it periodically runs queries against Elasticsearch data and fires actions based on conditions. It does not provide push-based event subscriptions or real-time webhooks that external systems can subscribe to.
