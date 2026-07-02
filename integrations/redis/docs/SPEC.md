Now I have enough information to write the specification. Let me compile what I've learned about Redis Cloud's REST API.

# Slates Specification for Redis

## Overview

Redis Cloud is a fully managed database-as-a-service (DBaaS) by Redis, offering Redis deployments on AWS, Google Cloud, and Azure. The Redis Cloud REST API helps you manage your Redis Cloud databases programmatically, allowing you to create or manage databases, define or change hosting credentials, audit access via logs, and backup or import databases.

## Authentication

The Redis Cloud REST API requires API access to be explicitly enabled on your account, as it is disabled by default.

Authentication uses two API keys provided as HTTP request headers:

1. **Account Key (`x-api-key`)**: Identifies your specific account when you perform an API request. This is the account responsible for your subscription. You create the account key once when enabling API access.

2. **User Key (`x-api-secret-key`)**: A personal key that belongs to a specific user having the Owner, Viewer, or Logs viewer role.

Every API request must use the account key and a user key to authenticate. Both keys are passed as HTTP headers on each request:

```
x-api-key: <account-key>
x-api-secret-key: <user-key>
```

The base API endpoint is `https://api.redislabs.com/v1`.

By default, REST API requests are allowed from all IP addresses. To limit access to specific addresses, define a CIDR allow list for the user key.

Additional authorization conditions: The account and user keys must be valid, the user key must be associated with the same account as the account key, and the request must originate from a valid source IP address as defined in the CIDR allow list.

## Features

### Subscription Management

Create, update, delete, and list Redis Cloud subscriptions. Subscriptions define the infrastructure plan (Essentials or Pro), cloud provider, region, and payment method. The Redis Cloud REST API lets you create and manage all kinds of subscriptions. Pro subscriptions allow specifying cloud provider, region, networking CIDR, and database sizing. Essentials subscriptions require a plan ID.

### Database Management

Create, update, delete, and list databases within subscriptions. Databases can be configured with parameters such as dataset size, data persistence settings, replication, modules, and Redis version. When you create a subscription, you must specify one or more databases in the "databases" array.

### Database Backup and Import

When you create or update a database, you can specify the backup path. The import API operation lets you import data from various source types and specified locations. You can import data into an existing database from multiple storage sources, including AWS S3, Redis, and FTP. Backups are stored in RDB format and can target AWS S3, Google Cloud Storage, Azure Blob Storage, or FTP servers.

### Access Control (ACL) Management

Manage Redis ACL rules and roles for fine-grained access control to databases. You can create, list, update, and delete Redis rules (defining permitted commands and key patterns) and roles (grouping rules for assignment to databases and users).

### User Management

You can use the Redis Enterprise Cloud REST API to update, delete and list users. Users have roles (Owner, Viewer, Logs viewer) and configurable options such as email alerts and MFA.

### Cloud Account Management

Register and manage cloud provider accounts (AWS, GCP, Azure) that host your Redis Cloud subscriptions. These define the hosting credentials and cloud provider configuration.

### Payment Methods

List and manage payment methods associated with your Redis Cloud account, used for billing subscriptions.

### Task Tracking

Asynchronous operations are long running tasks that do not return immediately. They return an HTTP status code of 201 along with a task ID. The task ID can be used to track the status of a specific request.

### Audit Logging

Access system logs to audit API activity. The service log tracks API requests and the keys used to authenticate each request.

### Cost Estimation

Estimate the cost of planned subscriptions and databases before creating them. A "dryrun" flag can be set to true to do a dry run without actually executing the request. A task will be created but the resources will not be created or modified.

## Events

The Redis Cloud REST API does not natively support webhooks or event subscription mechanisms for programmatic consumers.

Pro and paid Essentials plans can trigger custom webhooks for alerts, but these are limited to operational alerting (e.g., threshold-based monitoring alerts sent to tools like Slack) rather than a general-purpose event subscription system for API integrations.

The provider does not support events.
