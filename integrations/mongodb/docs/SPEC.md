Now let me fetch the API spec page to get the full list of resource categories:Now I have a comprehensive view. Let me compile the specification.

# Slates Specification for MongoDB

## Overview

MongoDB Atlas is a cloud database platform that provides managed MongoDB deployments across AWS, Azure, and Google Cloud. The Atlas Administration API (v2) enables programmatic management of all Atlas infrastructure components, including clusters, projects, organizations, users, backups, and networking. Note: the Administration API manages infrastructure only — it does not provide direct access to the data stored in clusters.

## Authentication

MongoDB Atlas Administration API supports two authentication methods:

### 1. OAuth 2.0 Service Accounts (Recommended)

Service accounts provide improved security over API keys by using the industry standard OAuth 2.0 protocol with the Client Credentials flow. A service account lets you manage permissions and create access tokens that authenticate API requests. Each service account has a client ID and a secret that function as a username and a password for creating access tokens.

- **Grant type:** `client_credentials`
- **Token endpoint:** Obtain an access token using the client ID and secret, then include the access token as a Bearer token in the `Authorization` header.
- Service Account OAuth Access Tokens validity is expressed as a number of seconds in the `expires_in` field.
- Service accounts can be scoped to an organization or project with specific Atlas roles (e.g., Organization Owner, Project Read Only).
- IP access lists apply to using service account access tokens, not creating or revoking them. You can generate a token from any IP address, but you can only use it to call the API if your IP address is on the access list.

### 2. API Keys with HTTP Digest Authentication (Legacy)

API keys are a legacy method of authenticating to the Atlas Administration API that uses HTTP Digest Authentication. API keys have two parts: a Public Key and a Private Key. These serve the same function as a username and a password to authenticate API requests.

- Provide the Public Key as the username and Private Key as the password in an HTTP Digest auth request.
- Each pair of API keys belongs to only one organization, and can grant access to any number of projects in that organization.
- Example: `curl --user "{PUBLIC-KEY}:{PRIVATE-KEY}" --digest -X GET "https://cloud.mongodb.com/api/atlas/v2/..."`

### General Notes

- **Base URL:** `https://cloud.mongodb.com/api/atlas/v2`
- When you create an organization using the Atlas UI, Atlas enables the API IP access list feature by default. This limits API requests to only those from the location-based IP or CIDR addresses that you specify in the IP access list.
- All requests require a versioned `Accept` header, e.g., `Accept: application/vnd.atlas.2025-03-12+json`.
- Many Atlas Administration API endpoint URLs follow the format of `/api/atlas/<version>/groups/<GROUP-ID>/`, where `<GROUP-ID>` is your project ID.

## Features

### Organization and Project Management

Manage the organizational hierarchy in Atlas. Create, update, list, and delete organizations and projects. Manage organization settings, invitations, and project limits. Projects (also called "groups") are the primary containers for clusters and other resources.

### Cluster Lifecycle Management

Core features include creating, scaling, updating, and deleting clusters. You can configure cluster tier, cloud provider, region, replication, sharding, auto-scaling, and advanced configuration options. Supports pausing/resuming clusters (M10+), testing failover, and loading sample datasets. Also includes Flex Clusters and Serverless Instances as alternative deployment types.

### Database User Management

The Atlas Administration API doesn't provide access to the data stored in your clusters. You can use the Atlas Administration API to create and manage database users. Create, update, and delete database users with specific roles and scopes. Supports SCRAM, X.509, LDAP, and AWS IAM authentication for database users. Custom database roles can also be created and managed.

### Cloud Backups

Manage backup snapshots, schedules, and restore jobs. Take on-demand snapshots, configure backup compliance policies, schedule automated backups, and initiate restores to the same or different clusters. Supports exporting snapshots to cloud object storage (S3, Azure Blob, GCS). Available for dedicated, flex, and shared-tier clusters.

- Atlas backups are immutable by default. Therefore, it is not possible to modify a snapshot.
- This feature is not available for M0 Free clusters.

### Network Security and Access Control

Configure IP access lists for projects to control which IP addresses can connect to clusters. Set up network peering connections with AWS, Azure, or GCP VPCs. Create and manage private endpoint services for secure connectivity. Configure encryption at rest using customer-managed keys (AWS KMS, Azure Key Vault, Google Cloud KMS).

### Monitoring and Logs

Retrieve host process metrics, disk measurements, database-level metrics, and Atlas Search metrics. Download cluster logs for individual hosts. Access the Performance Advisor for slow query analysis, suggested indexes, and schema advice. View collection-level latency metrics and query shape insights.

### Alerts and Alert Configurations

Atlas issues alerts for the database and server conditions configured in your alert settings. When a condition triggers an alert, Atlas displays a warning symbol on the cluster and sends alert notifications. Your alert settings determine the notification methods. Create and manage alert configurations with conditions, thresholds, and matchers. Acknowledge or resolve alerts programmatically.

### Third-Party Integrations

You can integrate Atlas with third-party monitoring services to receive Atlas alerts in various external monitoring services, and to view and analyze performance metrics that Atlas collects about your cluster. Supported integrations include Datadog, Opsgenie, PagerDuty, Slack, Microsoft Teams, Splunk On-Call, Prometheus, and generic webhooks.

### Atlas Search

Create and manage Atlas Search indexes on collections. Configure search nodes (dedicated infrastructure for search workloads). Supports creating, updating, and deleting search indexes by name or ID.

### Data Federation and Online Archive

Create and manage federated database instances that can query data across Atlas clusters, S3 buckets, and other data sources. Set up online archives to automatically tier cold data from clusters to cheaper cloud storage while keeping it queryable.

### Atlas Stream Processing

Manage stream processing workspaces, connections, and processors. Connect to Kafka and other streaming sources, define stream processors, and control their lifecycle (start, stop, update).

### Federated Authentication

Configure identity providers (SAML, OIDC) for federated authentication. Manage organization-level federation settings, role mappings, and connected organization configurations.

### Invoices and Billing

Retrieve invoices, pending charges, and line item details for an organization. Use the Cost Explorer to analyze usage and costs across projects and clusters.

### Cloud Migration Service

Migrate data from self-managed MongoDB deployments or other Atlas organizations to Atlas clusters. Validate migration configurations, initiate live migrations, and perform cutover operations.

### Auditing

Configure and retrieve database audit log settings for a project. Audit logging helps track database access and operations for compliance.

### Activity Feed and Events

Access activity feeds for organizations and projects, listing events such as configuration changes, user actions, and system events.

## Events

### Atlas Alert Webhooks

Atlas supports sending alert notifications to a webhook URL when configured alert conditions are met. Login into your project and go to Integrations, from the list of possible integrations, choose Webhook Settings and click "Configure". You configure a webhook URL (and optional secret) at the project level under third-party integrations, then select "Webhook" as a notification target on individual alert configurations.

- **Event types:** All Atlas alert types can be sent to webhooks, including host down, replication lag, disk utilization thresholds, connections thresholds, and many other metric-based and conditional alerts.
- **Payload:** Atlas sends a JSON payload containing alert details such as event type name, status (OPEN/CLOSED), group ID, cluster/host identifiers, timestamps, and alert metadata.
- **Configuration:** Set via the Atlas UI under project Integrations → Webhook Settings, or programmatically via the Third-Party Integrations API. Each alert configuration can independently opt in to webhook notifications.

### Atlas Triggers (Database Triggers)

Atlas Triggers execute application and database logic. Triggers can respond to events or use pre-defined schedules. Database triggers use MongoDB change streams to listen for data changes in a specified collection or database.

- **Supported operation types:** Insert, Update, Delete, Replace, and Drop events on collections or databases.
- Triggers support `$match` expressions to filter change events and `$project` expressions to limit the data included in each event.
- **Event handling:** Triggers can execute an Atlas Function or forward events to AWS EventBridge.
- You control which operations cause a Trigger to fire as well as what happens when it does. For example, you can run a Function whenever a specific field of a document is updated. The Function can access the entire change event, so you always know what changed.
- **Ordered vs. unordered:** Ordered triggers process events sequentially; unordered triggers can process events concurrently.
- **Scope:** Can be configured at the collection, database, or deployment level.

### Atlas Triggers (Scheduled Triggers)

Scheduled triggers run on a cron-based schedule, executing an Atlas Function or sending events to AWS EventBridge at defined intervals. These are not event-driven but time-driven.
