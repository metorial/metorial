# Slates Specification for Snowflake

## Overview

Snowflake is a cloud-based data platform that provides data warehousing, data lake, and data sharing capabilities. It offers REST APIs for executing SQL statements, managing resources (databases, schemas, tables, warehouses, users, roles, etc.), and ingesting streaming data. Snowflake runs on AWS, Azure, and Google Cloud, with each account accessible via a unique URL based on an account identifier.

## Authentication

Snowflake supports multiple authentication methods for its REST APIs:

### Key Pair Authentication (JWT)

Key-pair authentication uses a public-private RSA key pair. To use this method:

1. Generate an RSA key pair (minimum 2048-bit).
2. Assign the public key to your Snowflake user via `ALTER USER ... SET RSA_PUBLIC_KEY=...`.
3. Generate a JSON Web Token (JWT) using the private key.
4. Include the JWT as a Bearer token in the `Authorization` header of each request.
5. Set the `X-Snowflake-Authorization-Token-Type` header to `KEYPAIR_JWT`.

The base URL for all API requests is: `https://<account_identifier>.snowflakecomputing.com`

The account identifier typically follows the format `<org_name>-<account_name>`.

### OAuth 2.0

Snowflake supports the OAuth 2.0 protocol for authentication and authorization with two options:

**Snowflake OAuth** (Snowflake acts as the authorization server):

- Snowflake implements only the Authorization Code flow.
- Requires creating a security integration in Snowflake (`CREATE SECURITY INTEGRATION ... TYPE = OAUTH`).
- Authorization endpoint: `https://<account>.snowflakecomputing.com/oauth/authorize`
- Token endpoint: `https://<account>.snowflakecomputing.com/oauth/token-request`
- Access tokens have a short life; typically 10 minutes. Refresh tokens can be used to obtain new access tokens.
- Scopes control which Snowflake role is used in the session. Common scope values: `session:role:<role_name>` to request a specific role, or `refresh_token` to request refresh token issuance.
- By default, Snowflake prevents the ACCOUNTADMIN, ORGADMIN, GLOBALORGADMIN, and SECURITYADMIN roles from authenticating via OAuth.

**External OAuth** (third-party authorization server such as Okta, Microsoft Entra ID, Ping Identity, or a custom server):

- The scope parameter in the authorization server limits the operations and roles permitted by the access token.
- Scopes: `session:role:<role_name>` for a specific role, or `session:role-any` to allow the default role for the user.
- Requires creating an External OAuth security integration in Snowflake linking to the external IdP.

For both OAuth methods, set the `Authorization` header to `Bearer <access_token>`.

### Programmatic Access Tokens (PAT)

You can use programmatic access tokens in place of a password in third-party applications (such as Tableau or PowerBI) or as the password argument when connecting via Snowflake connectors. PATs are generated via Snowsight or SQL commands and are tied to a specific user and role. By default, using programmatic access tokens requires a network policy to be activated for a user or for all users in the account.

## Features

### SQL Statement Execution

The SQL API allows submitting SQL statements for execution, checking the status of execution, and canceling execution. It supports standard queries and most DDL and DML statements. You can specify the target warehouse, database, schema, and role per request. Multiple SQL statements can be sent in a single API request. SQL can be executed within transactions.

- Statements can be executed synchronously or asynchronously.
- The SQL API does not support certain types of stored procedures, such as Python and Java/Scala stored procedures that return a resultset in Arrow format.

### Resource Management

The Snowflake REST APIs allow managing Snowflake resource objects. You can create, drop, and alter tables, schemas, warehouses, tasks, and more, without writing SQL. Available resource APIs include: databases, schemas, tables, warehouses, roles, users, grants, tasks, dynamic tables, stages, streams, pipes, functions, procedures, alerts, network policies, secrets, sequences, notebooks, and more.

- Not all resources currently provide 100% coverage of their equivalent SQL commands, but the APIs are under active development.
- These REST APIs are compliant with the OpenAPI specification.

### Data Ingestion via Snowpipe

The Snowpipe REST API allows defining the list of files to ingest and fetching reports of load history. It provides an endpoint for informing Snowflake about files to be ingested into a table. A successful response means Snowflake has recorded the list of files, not that ingestion is complete.

- Snowpipe auto-ingest can also be triggered by cloud storage event notifications (S3, GCS, Azure Blob).

### Streaming Data Ingestion (Snowpipe Streaming)

Snowpipe Streaming is Snowflake's service for continuous, low-latency loading of streaming data directly into Snowflake, enabling near real-time data ingestion and analysis. You don't need to create files to load data; the API enables automatic, continuous loading of data streams as data becomes available.

- Available via Java SDK, Python SDK, and REST API.
- Data is ingested through channels. A channel represents a logical, named streaming connection to Snowflake for loading data into a table in an ordered manner.
- The API is currently limited to inserting rows.

### Cortex AI Services

The REST APIs provide access to Snowflake Cortex features including search, inference, and embedding services. These allow deploying and querying ML models and performing AI-powered operations on data within Snowflake.

### Notifications

You can configure Snowflake to send notifications to a queue provided by a cloud service (Amazon SNS, Google Cloud PubSub, or Azure Event Grid), an email address, or a webhook. Supported webhook destinations include Slack, Microsoft Teams, and PagerDuty. This is useful for alerting on task failures, pipeline errors, or custom conditions.

## Events

Snowflake does not support inbound webhooks or event subscriptions where external consumers can listen for events from Snowflake via a push mechanism.

Unlike traditional incoming webhooks, Snowflake focuses on outbound notifications for pipeline alerts, task failures, and data pipeline monitoring. Snowflake doesn't natively support receiving and processing events from arbitrary external systems. It only supports notification integrations for sending data to certain webhooks.

Snowflake's notification system is designed for Snowflake to push alerts _out_ to external systems (e.g., when a task fails or a Snowpipe encounters an error), not for external systems to subscribe to Snowflake events. These outbound notifications are configured via SQL and notification integrations, not via an event subscription API.
