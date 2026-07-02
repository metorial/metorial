# Slates Specification for ClickHouse

## Overview

ClickHouse is an open-source column-oriented database management system optimized for online analytical processing (OLAP). It allows users to generate analytical reports using SQL queries in real-time. ClickHouse Cloud is the fully managed cloud offering, providing a REST API designed for developers to manage organizations and services, provision API keys, add or remove members, and more.

## Authentication

The ClickHouse Cloud API uses **HTTP Basic Authentication** with API key pairs.

The ClickHouse Cloud API uses HTTP Basic Authentication to verify the validity of your API keys. To authenticate:

1. **Create an API key** in the ClickHouse Cloud Console under the **API Keys** tab. When creating an API key, specify the key name, permissions for the key, and expiration time.
2. You receive a **Key ID** and **Key Secret**. The Key ID is used as the username and the Key Secret as the password for HTTP Basic Auth.
3. Send requests with `Authorization: Basic <base64(KEY_ID:KEY_SECRET)>` header, or use `--user KEY_ID:KEY_SECRET` with curl.

**Base URL:** `https://api.clickhouse.cloud/v1`

**Permissions / Roles:**

- The **Developer** role has read-only permissions for assigned services and the **Admin** role has full read and write permissions.
- To use API keys with Query API Endpoints, set Organization Role to Member (minimum) and grant Service Role access to Query Endpoints.

**Additional controls:**

- API key IP filters allow setting up an IP allow list to limit where the API key may be used.
- Keys can be given an expiration time, and can be disabled or deleted from the console.

All API operations are scoped to an **organization**, identified by an `organizationId` path parameter.

## Features

### Organization Management

Manage your ClickHouse Cloud organization, including viewing and updating organization details. You can list all members in the organization, update member roles, and manage invitations. You can also retrieve a list of all organization activities.

### Service Lifecycle Management

Perform lifecycle operations on ClickHouse services, such as launching, starting, and stopping services. Services can be deleted, but must be in a stopped state first and are deleted asynchronously. You can create new services specifying cloud provider, region, and configuration.

### Scaling Configuration

Configure advanced scaling policies, including minimum and maximum size and idling. Replica scaling settings can be updated to control the number of replicas and resource allocation per replica.

### Backup Management

You can retrieve a list of all backups for a service, with the most recent backups listed first. Backup configuration can also be updated.

### API Key Management

You can provision API keys programmatically, list existing keys, and delete keys. Only a key not used to authenticate the active request can be deleted.

### ClickPipes (Data Ingestion Pipelines)

ClickPipes is an integration engine that simplifies data ingestion from a variety of sources. It supports sources like Apache Kafka, Amazon S3, Google Cloud Storage, Amazon Kinesis, PostgreSQL, and MySQL. Via the API you can create, update, list, delete, and scale ClickPipes. ClickPipes includes dedicated API endpoints as part of the ClickHouse Cloud OpenAPI, supporting automated management of pipeline configurations and CI/CD integration.

### Query Endpoints

The Automatic Query Endpoints feature allows you to create an API endpoint directly from any saved SQL query in the ClickHouse Cloud Console. You can configure which API keys can access each endpoint, assign roles, and set CORS policies. Query endpoints support parameterized queries.

### Private Endpoint Management

Create private endpoints associated with a service and organization. Reverse private endpoints are also supported, allowing ClickHouse Cloud to securely initiate connections to private customer resources.

### Usage and Metrics

A UsageCost API endpoint supports retrieving usage information at the organization level, queryable for a maximum of 31 days, covering Storage, Compute, Data Transfer, and ClickPipes. Prometheus metrics can be retrieved for all services in an organization or for individual services.

### BYOC (Bring Your Own Cloud) Infrastructure

You can create new BYOC infrastructure in the organization and retrieve its configuration. Existing BYOC infrastructure can be updated.

### ClickStack (Observability)

ClickStack APIs allow programmatic management of observability resources. Sources and Webhooks are supported resources — you can list configured data sources and webhook destinations. You can create and manage dashboards and alerts via the API, with alerts supporting webhook notifications to services like Slack and PagerDuty.

## Events

The ClickHouse Cloud API does not provide a native webhook or event subscription mechanism for listening to changes in services, organizations, or data. There is no built-in push-based notification system or purpose-built polling mechanism exposed through the Cloud API for external consumers to subscribe to events.

The provider does not support events.
