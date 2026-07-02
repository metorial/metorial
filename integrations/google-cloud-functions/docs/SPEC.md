# Slates Specification for Google Cloud Functions

## Overview

Google Cloud Functions (now part of Cloud Run functions) is a serverless Functions-as-a-Service (FaaS) platform on Google Cloud. It allows you to run backend code without provisioning or managing servers, with functions triggered by events such as changes in Cloud Storage buckets, messages published to Pub/Sub topics, or HTTP requests. The Cloud Functions API provides programmatic access to manage functions, deployments, and configurations.

## Authentication

The Cloud Functions API uses Google Cloud's standard authentication mechanisms:

### OAuth 2.0 with Service Account

The primary method for programmatic access. An application typically uses a service account when it uses Google APIs to work with its own data rather than a user's data.

1. Create a service account in the Google Cloud Console and download the JSON key file.
2. Create a Credentials object from the service account's credentials and the scopes your application needs access to, then use it to obtain an access token.
3. Your server application uses a JWT to request a token from the Google Authorization Server, then uses the token to call a Google API endpoint.

**Token endpoint:** `https://oauth2.googleapis.com/token`

**Required OAuth 2.0 scopes:**

- `https://www.googleapis.com/auth/cloud-platform` — Full access to all Google Cloud resources.

**Required IAM roles for managing functions:**

- `roles/cloudfunctions.developer` — Create, update, and delete functions.
- `roles/cloudfunctions.viewer` — View functions.

**Required IAM roles for invoking functions:**

- To invoke an authenticated function, the principal must have the invoker IAM permission `run.routes.invoke`, usually through the Cloud Run Invoker role (`roles/run.invoker`).

### OAuth 2.0 Authorization Code Flow

For user-delegated access, the standard Google OAuth 2.0 authorization code flow can be used. Google APIs use the OAuth 2.0 protocol for authentication and authorization, supporting common scenarios such as web server, client-side, installed, and limited-input device applications.

**Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
**Token endpoint:** `https://oauth2.googleapis.com/token`

### Invoking HTTP Functions

To invoke an authenticated function, the underlying principal must have permission to invoke the function and provide an ID token when it invokes the function. The ID token is passed in the `Authorization: Bearer <token>` header.

**API Base URL:** `https://cloudfunctions.googleapis.com`

**Required inputs:**

- Google Cloud Project ID
- Region/location where functions are deployed

## Features

### Function Lifecycle Management

Create, update, get, list, and delete Cloud Functions within a project. Each function describes user computation executed in response to an event and encapsulates function and trigger configurations. Functions can be configured with a runtime (Node.js, Python, Go, Java, .NET, Ruby), entry point, source code location, memory allocation, timeout, and environment variables.

- Source code can be provided from a Cloud Storage archive or a Cloud Source Repository.
- Functions support secret environment variables, with the information necessary to fetch the secret value from Secret Manager.
- Ingress settings control what traffic can reach the function; egress settings control what traffic is diverted through a VPC Access Connector.

### Function Invocation

Invoke deployed HTTP functions by sending HTTP requests to their assigned URL endpoint. Event-driven functions can only be invoked by the event source they're subscribed to, while HTTP functions can be invoked by different identity types.

- Functions can be configured to allow unauthenticated invocations (public) or require authentication.

### Event Triggers

Configure functions to be triggered by events from various Google Cloud services via Eventarc. Triggers use filters based on exact matches on CloudEvents attributes, and EventTrigger describes events to be sent from another service.

- Supported event sources include Cloud Storage, Pub/Sub, Firestore, Firebase Authentication, and Cloud Audit Logs.
- Retry policies can be configured for function execution failures; retried executions are charged as any other execution.

### Runtime Information

List available runtimes and their status (supported, deprecated, decommissioned). The service supports multiple languages including Node.js, Python, Go, Java, .NET, and Ruby.

### Function Upgrade and Migration

Manage the upgrade lifecycle of functions from 1st gen to 2nd gen. The API provides operations to redirect traffic to upgraded versions, commit upgrades, roll back traffic, and abort upgrades. The API provides information related to a function's eligibility for 1st gen to 2nd gen migration and the current state of migration.

### Source Code Upload and Download

Generate signed URLs for uploading function source code to Cloud Storage and for downloading deployed function source code. This enables programmatic deployment workflows without direct Cloud Storage access.

### Long-Running Operations

Operations such as creating, updating, and deleting functions are long-running operations (LROs) that usually generate two audit log entries: one when the operation starts and another when it ends. The API allows listing and polling operations for status.

## Events

Google Cloud Functions integrates with **Eventarc** and **Cloud Audit Logs** to support event-driven architectures. However, the Cloud Functions API itself does not provide a webhook or event subscription mechanism for changes to Cloud Functions resources.

To monitor changes to Cloud Functions resources (e.g., function created, updated, deleted), you can use:

### Cloud Audit Log Events (via Eventarc)

Google Cloud services generate audit logs that record administrative and access activities within your Google Cloud resources. When you call a method, Cloud Run functions generates an audit log.

- **Admin Activity logs** — Methods that require an IAM permission with the type property value of `ADMIN_WRITE` generate Admin Activity audit logs. These include function create, update, and delete operations.
- **Data Access logs** — Methods that require an IAM permission with the type property value of `DATA_READ`, `DATA_WRITE`, or `ADMIN_READ` generate Data Access audit logs. These include get and list operations.
- With Eventarc, you can create a trigger that listens to these audit logs and sends an HTTP request in the form of a CloudEvent to a Cloud Run service. This allows you to react to function lifecycle events in near real-time.

The audit log service name is `cloudfunctions.googleapis.com`. You can filter on specific method names such as `CreateFunction`, `UpdateFunction`, `DeleteFunction`, etc.
