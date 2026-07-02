# Slates Specification for BigQuery

## Overview

Google BigQuery is a fully managed, serverless data warehouse provided by Google Cloud Platform. It allows querying data stored in BigQuery or running queries on data where it lives using external tables or federated queries, including Cloud Storage, Bigtable, Spanner, or Google Sheets. It supports ANSI-standard SQL queries including joins, nested and repeated fields, analytic and aggregation functions, and geospatial analytics.

## Authentication

BigQuery uses Google Cloud's standard authentication mechanisms. The REST API requires OAuth 2.0 authentication. There are several ways to authenticate:

### OAuth 2.0 (User Credentials)

For authenticating as a user, BigQuery supports the standard Google OAuth 2.0 authorization code flow. You need:

- **Client ID** and **Client Secret**: Created in the Google Cloud Console under APIs & Services → Credentials.
- **Authorization endpoint**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint**: `https://oauth2.googleapis.com/token`
- **Project ID**: Your Google Cloud project ID, required for all API calls.

### Service Account (Server-to-Server)

For non-GCP environments or fine-grained permissions, create a service account, grant roles (e.g., BigQuery Data Editor, Job User), and download the JSON key file. The service account JSON key contains the private key and client email needed to generate a signed JWT, which is exchanged for an access token. By using JWT directly as a bearer token, rather than an OAuth 2.0 access token, you can avoid having to make a network request to Google's authorization server before making an API call.

### OAuth 2.0 Scopes

BigQuery declares several OAuth 2.0 scopes:

- `https://www.googleapis.com/auth/bigquery` — View and manage your data in Google BigQuery.
- `https://www.googleapis.com/auth/bigquery.insertdata` — Insert data into Google BigQuery.
- `https://www.googleapis.com/auth/bigquery.readonly` — View your data in Google BigQuery.
- `https://www.googleapis.com/auth/cloud-platform` — View and manage your data across Google Cloud Platform services.
- `https://www.googleapis.com/auth/cloud-platform.read-only` — View your data across Google Cloud Platform services.

Additional scopes for Google Drive (`https://www.googleapis.com/auth/drive`) may be needed when querying data from Google Sheets via federated queries.

### Required Inputs

- **Google Cloud Project ID**: Required for all API calls to scope requests to a specific project.
- **Location/Region**: Some operations require specifying a data location (e.g., `US`, `EU`).

## Features

### SQL Query Execution

Run SQL queries against BigQuery datasets. Queries are executed as asynchronous jobs that can be polled for status and results. Supports both interactive (on-demand) and batch query priorities. Queries use GoogleSQL (standard SQL) syntax, including DML (INSERT, UPDATE, DELETE, MERGE) and DDL (CREATE, ALTER, DROP) statements.

### Dataset Management

Create, update, list, and delete datasets. A dataset is a logical container for tables and views, similar to a schema or database. Datasets are bound to a specific location and contain access controls that govern who can access the data within them.

### Table Management

Create, update, list, and delete tables within datasets. Tables store structured data and support nested/repeated fields. Tables can be configured with expiration times, partitioning (by time or range), and clustering. Supports creating views and materialized views.

### Data Ingestion

Load data into BigQuery tables from various sources. Batch-load data from local files or Cloud Storage using formats that include Avro, Parquet, ORC, CSV, JSON, Datastore, and Firestore formats. Stream data with the Storage Write API for real-time ingestion.

### Data Export

Export table data to Google Cloud Storage in formats like CSV, JSON, and Avro. Exports are executed as asynchronous extract jobs.

### Job Management

Jobs represent async tasks (queries, loads, exports, copies) in BigQuery. You can list, get, and cancel jobs. Jobs provide status information including progress, errors, and statistics like bytes processed and slot usage.

### Table Data Access

Read rows directly from tables without running a query job. Insert rows into tables via streaming inserts for low-latency data ingestion. Copy tables within or across datasets and projects.

### External Data Sources

Query data stored in BigQuery or run queries on data where it lives using external tables or federated queries including Cloud Storage, Bigtable, Spanner, or Google Sheets stored in Google Drive. The BigQuery Connection API provides the control plane for establishing remote connections to allow BigQuery to interact with remote data sources such as Cloud SQL.

### Data Transfer Service

An API for managed ingestion pipelines. Examples include scheduling periodic ingestions from Cloud Storage, automated ingestion from Google properties such as YouTube, or data transfers from third-party partners. This is also where scheduled queries are defined and managed.

### Data Sharing (Analytics Hub)

This API facilitates data sharing within and across organizations. It allows data providers to publish listings that reference shared resources, including BigQuery datasets and Pub/Sub topics. Users can discover, search, and subscribe to listings, which creates a linked dataset in the subscriber's project.

### Machine Learning (BigQuery ML)

Create, train, evaluate, and predict with machine learning models directly in BigQuery using SQL. Supports models for classification, regression, clustering, time series forecasting, and more. Models are managed as resources within datasets.

### IAM and Access Control

BigQuery uses Identity and Access Management (IAM) for authorization. Permissions can be set at the project, dataset, and table level. The BigQuery Data Policy API helps users manage data policies for column-level security and data masking.

### Routines and User-Defined Functions

Create and manage routines including user-defined functions (UDFs) written in SQL or JavaScript, as well as stored procedures using procedural SQL.

## Events

BigQuery does not have a native webhook or event subscription system built into its own API. However, BigQuery activity can be captured as events through Google Cloud's audit logging infrastructure routed to Pub/Sub:

### Cloud Audit Logs via Log Sinks to Pub/Sub

Cloud Audit Logs are a collection of logs provided by Google Cloud that provide insight into operational concerns related to your use of Google Cloud services. By configuring a Cloud Logging log sink with a Pub/Sub topic as the destination, you can receive near-real-time event notifications for BigQuery activities. Audit logs are organized into three streams.

- **Admin Activity Events**: Reports activities and events such as table and dataset creation, deletion, and updates. Always enabled.
- **Data Access Events**: Contains entries about jobs using JobInsertion and JobChange events, and about table data modifications using TableDataChange and TableDataRead events. Must be explicitly enabled. Captures query executions, data reads, data loads, and streaming inserts.
- **System Events**: Captures system-initiated events such as table expiration (automatic deletion of expired tables).

Events can be filtered by resource type, method name, severity, and other log attributes when configuring the sink. For example, filtering on `protoPayload.methodName="jobservice.jobcompleted"` captures all completed job events.

### Data Transfer Service Pub/Sub Notifications

The BigQuery Data Transfer Service supports configuring a Pub/Sub topic to receive notifications when scheduled queries or transfer runs complete or fail. This provides event-driven awareness of data pipeline status without polling.
