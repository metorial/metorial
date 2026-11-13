# Google Cloud Storage specification

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

Upload, download, list, copy, move, and delete objects in buckets. Downloads preserve arbitrary binary bytes and return them as downloadable files with the object's content type, name, and size metadata. Supports multiple upload methods including simple uploads, resumable uploads (for large files or unreliable networks), multipart uploads, and parallel composite uploads. Objects can be streamed in or out without being stored locally first.

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

## Planned trigger: object_finalized (not available yet)

**Status: postponed.** The trigger is implemented but not offered: the integration currently exposes no event triggers. Cloud Storage publishes as the service agent of the project that owns each bucket, so every such project must be allowed to publish to the delivery topic, and for the built-in OAuth application that would mean the service operator adding each customer project by hand. The rest of this section describes the trigger as it will work when it is offered; the generation-aware tool behavior it describes is available today.

Only `OBJECT_FINALIZE` is watched, using `JSON_API_V1` metadata. Enabling events discovers configured-project buckets in pages of 50, checks `storage.buckets.get`, `storage.buckets.update`, `storage.objects.list`, and `storage.objects.get`, and bounds discovery to ten pages. The object permissions are required because events carry object names, sizes, checksums, and custom metadata; a caller who cannot read a bucket's objects is not offered that bucket. A partial scan does not imply missing buckets were removed. A watched bucket is identified by its name, project number, and creation timestamp, so a new bucket that reuses a deleted bucket's name does not inherit the earlier bucket's notification.

Delivery is set up once per Google OAuth application: one authenticated Pub/Sub topic and push subscription in the application's Cloud project, shared by every connection of that application. Whoever owns the OAuth application creates them by following the guided setup, the service operator for the built-in application and a customer for their own: create the topic, grant the Pub/Sub Publisher role on it to the Cloud Storage service agent (`service-<project number>@gs-project-accounts.iam.gserviceaccount.com`) of every project that owns a watched bucket, create a service account for push authentication, and create a push subscription that uses the shown delivery URL as its endpoint and audience. They then select the OAuth application and save the topic name, subscription name, and push service account email; the service operator supplies the client ID of the built-in application. Nothing is created in Google Cloud automatically, and Cloud Storage refuses a notification for a bucket whose project's service agent may not publish to the topic. Enabling a bucket creates and reads back a bucket notification with a deterministic ownership marker, and each delivery is matched to its connection by the notification configuration named in the message's `notificationConfig` attribute (`projects/_/buckets/<bucket>/notificationConfigs/<id>`). Retries recover an accepted creation whose response was lost; cleanup checks the marker, topic, event list and bucket identity, then confirms absence with an authorized notification list. A bucket that was deleted and created again under the same name has a later creation time and cannot hold the earlier notification, so cleanup treats it as confirmed removal and touches nothing in the new bucket. A bucket that answers 404 is not trusted on its own: cleanup lists the saved project's buckets filtered by the bucket name, and only a successful, complete listing without that exact name counts as confirmed removal. If the listing is denied, fails, cannot be completed, or still shows the bucket, or if the bucket answers 403, cleanup remains a failure. An unconfirmed 404 on the notification itself also remains a failure. Other applications' notifications are preserved. No OAuth credentials are stored with the notification.

Every notification's Google OIDC token is validated, including issuer, signature, expiry, exact audience, verified push-service-account email, and subscription. It then binds the notification configuration, bucket, ownership marker, and matching object name/generation across message attributes and metadata. An old event is not rejected solely for its age: provider redelivery can be delayed. Notification delivery IDs are not object event IDs.

Example output:

```json
{
  "eventType": "OBJECT_FINALIZE",
  "eventId": "stable-sha256-of-bucket-incarnation-object-and-generation",
  "eventTime": "2026-11-10T12:00:00Z",
  "bucketName": "documents-example",
  "objectName": "invoices/2026-11.pdf",
  "generation": "1794312000000000",
  "metageneration": "1",
  "sizeBytes": "153600",
  "contentType": "application/pdf"
}
```

Optional fields include checksums, storage class, provider creation/update timestamps, custom metadata, and `overwroteGeneration`. Generation values stay decimal strings without JavaScript numeric conversion. Finalization identifies an available version, not necessarily a first upload; failed uploads do not emit it. No historical backfill, exactly-once guarantee, or delivery ordering is promised. A notification produces no file content in its callback payload.

Generation-aware downstream tools use the JSON API's generation selectors. **Get Object** pins metadata and its download to the same generation, including when the caller initially requests the latest version; a removed old generation fails instead of falling back. **Update Object Metadata** supports generation and metadata preconditions. **Copy Object** supports source generation and destination generation preconditions. A move removes the source with an `ifGenerationMatch` precondition on the generation it read and copied, and without a `generation` selector: Cloud Storage deletes permanently when `generation` is given, whereas removing the live version of a versioned bucket keeps it as a noncurrent version. If the precondition fails (`412`), because the source was replaced meanwhile or the copied generation was not the live one, the copy stands, the source is left in place, and the result reports `sourceDeleted: false`. Retention and soft-delete policies still apply.

Verification boundaries: automated tests exercise payload binding, int64 preservation, duplicate identity, verification against the shared delivery configuration, eligibility permissions, lifecycle recovery and cleanup including a replaced bucket, plus deterministic event-to-action races and the move request. The paid live suite remains disabled and adds an isolated-delivery fixture lifecycle and versioned-object scenarios; its move assertions (a stale generation leaves the source in place, a live move keeps the source as a noncurrent version) have not been run against Cloud Storage. Real provider delivery, the Google Cloud delivery setup, and production delivery have not been verified by these local tests.

References: [event and payload contract](https://docs.cloud.google.com/storage/docs/pubsub-notifications), [notification resource](https://docs.cloud.google.com/storage/docs/json_api/v1/notifications), [generation-specific reads](https://docs.cloud.google.com/storage/docs/json_api/v1/objects/get), [copy preconditions](https://docs.cloud.google.com/storage/docs/json_api/v1/objects/copy), [object deletion](https://docs.cloud.google.com/storage/docs/json_api/v1/objects/delete), [object versioning](https://docs.cloud.google.com/storage/docs/object-versioning), [request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions), [permission test](https://docs.cloud.google.com/storage/docs/json_api/v1/buckets/testIamPermissions), [authenticated push](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions).
