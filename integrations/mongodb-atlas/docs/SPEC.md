Now let me get the full list of API resource categories from the Atlas Admin API spec:Now I have enough information. Let me compile the specification.

# Slates Specification for MongoDB Atlas

## Overview

MongoDB Atlas is a fully managed cloud database platform that provides hosted MongoDB deployments on AWS, Azure, and Google Cloud. The Atlas Administration API allows programmatic management of infrastructure resources such as clusters, projects, users, alerts, and network configurations. It does not provide direct access to data stored in databases — that requires database driver connections.

## Authentication

MongoDB Atlas supports two authentication methods for its Administration API:

### 1. Service Accounts with OAuth 2.0 (Recommended)

Service accounts use the OAuth 2.0 Client Credentials flow to generate short-lived access tokens.

- **Setup:** Create a service account in the Atlas UI at the organization or project level. You receive a **Client ID** and **Client Secret**.
- **Token exchange:** Use the client credentials to request an access token from the MongoDB OAuth token endpoint.
- **Usage:** Include the access token as a Bearer token in the `Authorization` header of API requests.
- **Scoping:** Service accounts are assigned Atlas roles (e.g., Organization Owner, Project Read Only) that determine their access level. A service account belongs to an organization and can be granted access to one or more projects.
- **IP Access List:** API requests using access tokens are restricted to IP addresses on the service account's access list. Token creation itself is not restricted by the access list.
- **Token Lifetime:** Access tokens are short-lived; the `expires_in` field indicates validity in seconds.

### 2. API Keys with HTTP Digest Authentication (Legacy)

API keys use HTTP Digest Authentication and consist of a **Public Key** (username) and **Private Key** (password).

- **Setup:** Create an API key pair via the Atlas UI at the organization or project level.
- **Usage:** Include the Public Key and Private Key as the username and password in an HTTP Digest Authentication header.
- **Scoping:** Each API key pair belongs to one organization and can be granted access to multiple projects within that organization. Keys are assigned Atlas roles to control permissions.
- **IP Access List:** When enabled (default for new organizations), API requests are restricted to IPs/CIDRs on the key's access list.

### Base URL

All API requests use the base URL: `https://cloud.mongodb.com/api/atlas/v2`

Requests require an `Accept` header with a versioned media type, e.g.:
`Accept: application/vnd.atlas.2025-03-12+json`

## Features

### Organization and Project Management

Create, read, update, and delete Atlas organizations and projects. Projects (also called "groups") are the primary containers for clusters and other resources. Manage organization settings, project settings, and user/team assignments.

### Cluster Lifecycle Management

Provision, configure, modify, scale, pause, and delete database clusters (dedicated, flex, and free-tier). Configure cluster tier, cloud provider, region, storage, MongoDB version, and replication settings. Manage global clusters with custom zone mappings and managed namespaces.

### Database User Management

Create and manage database users with specific authentication methods (SCRAM, X.509, AWS IAM, LDAP, OIDC) and role-based access control. Assign built-in or custom database roles to control read/write permissions at the database or collection level.

### Network Access and Security

Configure IP access lists to control which addresses can connect to clusters. Set up network peering (AWS, Azure, GCP), private endpoints, and custom DNS. Manage encryption at rest with customer-managed keys, and configure database auditing.

### Backup and Restore

Manage cloud backups including on-demand snapshots, scheduled backup policies, and restore jobs. Supports point-in-time restore for dedicated clusters. Manage backup compliance policies and export snapshots to cloud storage (e.g., AWS S3).

### Monitoring and Alerts

Access real-time and historical cluster metrics, monitor host performance, and view database access logs. Configure alert conditions for metric thresholds (CPU, memory, connections, oplog, etc.) and operational events (host down, user joined, etc.). Route alert notifications to webhooks, Slack, PagerDuty, Datadog, Opsgenie, Microsoft Teams, email, or SMS.

### Atlas Search

Create, update, and delete Atlas Search indexes for full-text search on collection data. Configure analyzers, field mappings, and synonyms.

### Atlas Triggers

Define database triggers that fire server-side functions or forward events to AWS EventBridge in response to data changes. Supports collection-level, database-level, and deployment-level triggers. Configure match and project expressions to filter events. Also supports scheduled (cron-based) triggers.

### Performance Advisor

Retrieve suggested index recommendations and slow query data for database deployments to help optimize query performance.

### Online Archive

Configure rules to automatically move infrequently accessed data from clusters to cheaper cloud object storage while maintaining queryability through federated queries.

### Third-Party Integrations

Configure integrations with external monitoring and alerting services including Datadog, Opsgenie, PagerDuty, VictorOps, and custom webhooks for alert forwarding and metrics export.

### Federated Authentication

Configure federated authentication with SAML 2.0 identity providers. Manage identity provider connections, role mappings, and connected organization configurations.

### Push-Based Log Export

Continuously export mongod, mongos, and audit logs to an AWS S3 bucket for long-term storage and analysis.

### Invoices and Billing

Retrieve organization invoices and billing details through the API.

## Events

MongoDB Atlas supports events through two mechanisms:

### Alert Webhooks

Atlas can send alert notifications to a configured webhook URL when alert conditions are met. You configure a webhook URL (and optional secret) at the project level, then assign the webhook as a notification target on individual alert configurations.

- **Alert types:** Metric-based alerts (CPU, memory, disk, connections, replication lag, oplog window, etc.) and event-based alerts (host down, cluster created/deleted, user joined organization, failover, etc.).
- **Configuration:** Set the webhook URL and secret via the third-party integrations API or UI. Then, associate the webhook notification type with specific alert configurations.
- **Payload:** Alert webhook payloads include event type, alert configuration ID, group/project ID, cluster/host information, timestamps, and alert status.

### Database Triggers with AWS EventBridge

Atlas database triggers can forward change events to AWS EventBridge instead of (or in addition to) running Atlas Functions. This enables event-driven architectures that react to database changes.

- **Event sources:** Collection-level changes (insert, update, replace, delete), database-level changes (create/modify/rename/drop collection), and deployment-level changes (drop database).
- **Configuration:** Requires an AWS account ID and region. Supports match and project expressions to filter and shape events. Supports custom error handling functions.
- **Considerations:** Individual EventBridge entries must be smaller than 256 KB. Requires a dedicated cluster tier (M10+) for deployment-level triggers.
