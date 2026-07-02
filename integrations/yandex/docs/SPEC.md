# Slates Specification for Yandex

## Overview

Yandex Cloud is a public cloud platform developed by the Russian internet company Yandex, providing private and corporate users with infrastructure and computing resources in an "as a service" format. It includes infrastructure and data management services, tools for developing cloud applications and machine learning models, as well as proprietary ML-based services.

## Authentication

Yandex Cloud supports multiple authentication methods:

### 1. IAM Token (Recommended)

The recommended authentication method uses IAM tokens, though they have a short lifetime, making this method best for applications that can request tokens automatically. The IAM token lifetime does not exceed 12 hours.

IAM tokens are passed in the `Authorization` header as: `Authorization: Bearer <IAM_TOKEN>`

**For user accounts (Yandex ID):**
An OAuth token is used to authenticate users with a Yandex account: the user exchanges an OAuth token for an IAM token. To obtain an IAM token, POST the OAuth token to `https://iam.api.cloud.yandex.net/iam/v1/tokens` with body `{"yandexPassportOauthToken":"<OAuth_token>"}`.

**For service accounts:**
You can create a JSON Web Token (JWT) signed with an authorized key and exchange it for an IAM token, which allows you to control IAM token generation at every step. The JWT is signed using the PS256 algorithm with the service account's private key and exchanged at the same IAM token endpoint.

### 2. API Key (Simplified)

The API key is a private key used for simplified authorization. API keys are only used for service accounts. API keys do not expire, meaning this method is simpler but less secure. Use it if you can't automatically request an IAM token.

API keys are passed in the header as: `Authorization: Api-Key <API_key>`

When creating an API key, you can specify one or more scopes. A scope is the total of the actions a service account is allowed to perform. You cannot use an API key with specified scopes in other services or scopes.

### 3. Static Access Keys (AWS-compatible)

Static access keys should be used in services with an AWS-compatible API, such as Object Storage and Message Queue. These consist of a key ID and secret key, and follow AWS Signature V4 signing.

### 4. SAML Identity Federations

The authentication process for federated users depends on the IdP server settings. Yandex Cloud supports SAML-compatible identity federations.

### Required Context

All API requests require a **Cloud ID** and/or **Folder ID** to scope operations to the correct resources. A Folder ID identifies the project within the cloud and, if specified, will be used by default when creating resources.

## Features

### Compute (Virtual Machines)

Yandex Compute Cloud provides scalable computing capacity to create and manage virtual machines, supporting preemptible VMs and fault-tolerant instance groups. Users can create, start, stop, restart, and delete VM instances, manage disks, snapshots, and images.

### Object Storage (S3-compatible)

Provides cloud object storage with an AWS S3-compatible API. Users can create and manage buckets, upload/download objects, set access policies, and configure lifecycle rules. Authentication supports IAM tokens, static access keys, and temporary Security Token Service keys.

### Serverless Functions

Cloud Functions is a serverless compute service that executes user-provided code in response to HTTP requests or trigger events. Supports Node.js, Python, Go, Java, .NET, and other runtimes. Functions can be invoked via HTTP, triggers, or API Gateway.

### Managed Databases

Yandex Cloud offers managed database services for PostgreSQL, MySQL, ClickHouse, MongoDB, Redis, and more. Users can create clusters, manage backups, configure replicas, and scale resources without managing the underlying infrastructure.

### Machine Learning Services

- **Translate**: Machine translation between languages.
- **SpeechKit**: Speech synthesis (text-to-speech) and speech recognition (speech-to-text).
- **Vision**: Image analysis and OCR.
- **DataSphere**: Managed environment for ML development.

### Identity and Access Management (IAM)

Manage service accounts, roles, and access bindings for cloud resources. Create and manage API keys, authorized keys, and static access keys. Supports role-based access control at the organization, cloud, and folder levels.

### Resource Management

Organize resources into clouds and folders. Manage cloud metadata, quotas, and organizational structure.

### Virtual Private Cloud (VPC)

Create and manage virtual networks, subnets, route tables, security groups, and IP addresses.

### Container Registry

Store and manage Docker images. Create registries, push/pull images, and manage image lifecycle policies.

### Managed Kubernetes

Deploy and manage Kubernetes clusters with automatic scaling, updates, and integration with other Yandex Cloud services.

### Message Queue

Message Queue provides queues for messaging between applications. AWS SQS-compatible API for managing message queues.

### Data Streams

Yandex Data Streams is a scalable service for managing data streams in real time, continuously collecting data from various sources. The service API is compatible with the Amazon Kinesis Data Streams API.

### Monitoring

Collect, store, and visualize metrics for cloud resources. Set up alerts and dashboards. You can integrate Cloud Functions into Yandex Monitoring for automatic processing of incidents. Functions can be invoked when an alert fires.

### Cloud Logging

Yandex Cloud Logging allows you to read and write logs of services and user applications by grouping messages into log groups.

### Audit Trails

Yandex Audit Trails is a service that collects and uploads audit logs from Yandex Cloud resources, letting you use analytical tools and rapidly respond to events.

### DNS Management

Yandex Cloud DNS is a DNS zone and domain name management tool for your resources.

### API Gateway

Yandex API Gateway is an API gateway management service supporting OpenAPI 3.0 and extensions for compatibility with other cloud services.

### Search API

Programmatic access to Yandex search results for integration into applications.

### Yandex Disk (via separate API)

The Disk REST API can be used in mobile and desktop applications and web services. Users can work with their data on Yandex Disk from any device, including saving files directly without using local storage. You can also use the API to store system and user settings in the cloud.

### Yandex Direct (Advertising API)

The Yandex Direct API allows creating applications for managing advertising campaigns, such as automating routine operations, using custom bid management algorithms, and downloading statistics.

## Events

Yandex Cloud supports event-driven architectures through its **Triggers** system in Cloud Functions and Serverless Containers.

### Object Storage Triggers

Triggers for Object Storage activate a function when a certain event happens to an object in Yandex Object Storage. Trackable events include creating an object, editing an object ACL, and deleting an object. Events can be filtered using prefixes and suffixes for an object key.

### Container Registry Triggers

Triggers for Container Registry run a function when certain events occur with a Docker image from Yandex Container Registry. Trackable events: creating a Docker image, deleting a Docker image, creating a Docker image tag, and deleting a Docker image tag.

### Message Queue Triggers

Triggers that fire when messages arrive in a Yandex Message Queue, enabling serverless processing of queued messages.

### Data Streams Triggers

Triggers that activate when new data arrives in a Yandex Data Streams stream, allowing real-time stream processing.

### Timer Triggers

Timer is a trigger that calls a Cloud Functions function on a schedule, set as a cron expression.

### Cloud Logging Triggers

Triggers that invoke functions when new log entries appear in a specified Cloud Logging log group.

### IoT Core Triggers

Triggers that fire on messages from IoT Core MQTT topics.

### Budget Triggers

You can set conditions in the budget settings that act as trigger conditions, such as notification thresholds.

### Monitoring Alert Triggers

You can invoke a Cloud Functions function when an alert fires in Yandex Monitoring.

### Audit Trails Events

Audit Trails collects and delivers audit logs of Yandex Cloud resources to a bucket in Object Storage or a log group in Cloud Logging. These can be chained with Cloud Logging triggers for real-time event processing. Events cover management operations (create, update, delete) across all Yandex Cloud services.
