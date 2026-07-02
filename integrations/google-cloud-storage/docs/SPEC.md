Now let me fetch the OAuth scopes page to get the exact scope URLs:Now I have all the information needed to write the specification.

# Slates Specification for Google Cloud Storage

## Overview

Google Cloud Storage is an object storage service for storing and retrieving unstructured data on Google Cloud. Data is organized into buckets (containers) within projects, and each piece of data is stored as an immutable object. It provides features for access control, encryption, lifecycle management, and event-driven workflows via Pub/Sub notifications.

## Authentication

### OAuth 2.0 (Recommended)

Google recommends OAuth 2.0 authentication for interacting with the Google Cloud Storage API. Authentication follows standard Google OAuth 2.0 flows.

**Endpoints:**

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://accounts.google.com/o/oauth2/token`

**Scopes:**

| Scope            | URL                                                       | Description                                                                                          |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `read-only`      | `https://www.googleapis.com/auth/devstorage.read_only`    | Read data and list buckets                                                                           |
| `read-write`     | `https://www.googleapis.com/auth/devstorage.read_write`   | Read and modify data, but not metadata like IAM policies                                             |
| `full-control`   | `https://www.googleapis.com/auth/devstorage.full_control` | Full control over data, including modifying IAM policies                                             |
| `cloud-platform` | `https://www.googleapis.com/auth/cloud-platform`          | View and manage data across all Google Cloud services (equivalent to full-control for Cloud Storage) |

**Required credentials:**

- **Client ID** and **Client Secret** obtained by registering an application in the Google Cloud Console.
- **Project ID** of the Google Cloud project.

Access tokens are included in requests via the `Authorization: Bearer <token>` header.

### Service Account (Server-to-Server)

Service accounts are accounts that do not represent a human user. They provide a way to manage authentication and authorization when a human is not directly involved, such as when an application needs to access Google Cloud resources.

A service account JSON key file is downloaded from the Google Cloud Console. It contains:

- `client_email`
- `private_key`
- `project_id`

The private key is used to sign a JWT, which is exchanged for an OAuth 2.0 access token. The same scopes listed above apply.

### HMAC Keys (XML API only)

HMAC keys can be used to authenticate requests to the Cloud Storage XML API. HMAC keys are useful when you want to move data between other cloud storage providers and Cloud Storage, because HMAC keys allow you to reuse your existing code to access Cloud Storage.

HMAC keys consist of an **Access ID** and a **Secret** (40-character Base-64 encoded string). An HMAC key is a type of credential associated with an account, typically a service account. These are compatible with AWS S3 Signature V4 signing and are primarily useful for migrations from Amazon S3. HMAC keys are only usable with the XML API, not the JSON API.

## Features

### Bucket Management

Create, list, configure, and delete buckets within a project. Buckets can be configured with a geographic location (region, dual-region, or multi-region), a default storage class (Standard, Nearline, Coldline, Archive), and optional hierarchical namespace for folder-based organization. Buckets can have hierarchical namespace enabled, which lets you store data in a logical file system structure using folders. You can manage folders by using folder-specific operations, including creating, deleting, listing, and renaming.

### Object Storage and Retrieval

Upload, download, list, copy, move, and delete objects in buckets. Supports multiple upload methods including simple uploads, resumable uploads (for large files or unreliable networks), multipart uploads, and parallel composite uploads. Objects can be streamed in or out without being stored locally first.

### Access Control

Control who can access buckets and objects using two mechanisms:

- **IAM (Identity and Access Management):** Assign roles to principals at the project, bucket, or managed folder level.
- **Access Control Lists (ACLs):** Fine-grained per-object and per-bucket access rules (legacy approach).
- **Signed URLs:** Generate time-limited URLs that grant temporary access to specific objects without requiring the requester to have a Google account.
- **Uniform bucket-level access** can be enforced to disable ACLs and rely solely on IAM.

### Object Lifecycle Management

Soft delete prevents permanent loss of data against accidental or malicious deletion by retaining recently deleted objects and buckets. Configure rules to automatically transition objects between storage classes or delete them based on age, creation date, number of versions, or storage class. Autoclass can automatically manage storage classes based on access patterns.

### Versioning and Protection

- **Object Versioning:** Retain previous versions of objects when they are overwritten or deleted.
- **Object Holds:** Place holds on objects to prevent deletion.
- **Retention Policies (Bucket Lock):** Enforce minimum retention periods on objects.
- **Soft Delete:** Retain recently deleted objects for a configurable period (default 7 days).

### Encryption

Cloud Storage uses server-side encryption to encrypt your data by default. You can also use supplemental data encryption options such as customer-managed encryption keys and customer-supplied encryption keys.

- **Google-managed keys** (default, no configuration needed)
- **Customer-managed encryption keys (CMEK):** Use Cloud KMS keys you control.
- **Customer-supplied encryption keys (CSEK):** Provide your own encryption keys with each request.

### Data Replication and Availability

Configure turbo replication for dual-region buckets to achieve faster replication. Cross-bucket replication can be configured to replicate objects across buckets in different locations.

### Static Website Hosting

A Cloud Storage bucket can be configured to serve static website content for a domain you own by setting a main page and 404 page configuration.

### Interoperability with Amazon S3

Access to Cloud Storage through the XML API is useful when you are using tools and libraries that must work across different storage providers, or when you are migrating from another storage provider to Cloud Storage. The XML API is S3-compatible, enabling migration from Amazon S3 with minimal code changes.

## Events

Google Cloud Storage supports event notifications through two mechanisms:

### Pub/Sub Notifications (Recommended)

Pub/Sub notifications for Cloud Storage provide a modern, scalable, and reliable way to trigger actions in response to changes in your Cloud Storage buckets by sending event information to a Pub/Sub topic.

A notification configuration is attached to a bucket and specifies a target Pub/Sub topic and which event types to listen for. The valid types are: `OBJECT_FINALIZE`, `OBJECT_METADATA_UPDATE`, `OBJECT_DELETE`, `OBJECT_ARCHIVE`.

- **OBJECT_FINALIZE:** A new object is created or an existing object is overwritten (upload completes).
- **OBJECT_METADATA_UPDATE:** The metadata of an existing object changes.
- **OBJECT_DELETE:** An object is permanently deleted.
- **OBJECT_ARCHIVE:** A live version of an object becomes a noncurrent version (when versioning is enabled).

**Configuration options:**

- Cloud Storage will only send notifications for objects in this bucket whose names begin with the specified prefix. An optional object name prefix filter can be set.
- Up to 10 custom key/value attribute pairs can be attached to each notification message.
- Payload format can be set to `JSON_API_V1` (includes full object metadata) or `NONE` (attributes only).
- Cloud Storage guarantees at-least-once delivery to Pub/Sub. Consumers must handle duplicate messages.

**Requirements:** The Cloud Storage service agent for the project must be granted the `roles/pubsub.publisher` role on the target Pub/Sub topic.

### Object Change Notifications (Legacy)

Object change notifications are a legacy mechanism in Cloud Storage for notifying an application about changes to objects within a bucket. When an Object change notification is set up, Cloud Storage sends HTTP POST requests (webhooks) to a specified application URL whenever an object is added, updated, or deleted. This mechanism requires a publicly accessible HTTPS endpoint. Google recommends using Pub/Sub notifications for Cloud Storage for new implementations due to its reliability, scalability, and flexibility.
