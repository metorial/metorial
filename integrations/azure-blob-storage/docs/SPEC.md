Now let me also check on blob storage features like access tiers, lifecycle management, and change feed:# Slates Specification for Azure Blob Storage

## Overview

Azure Blob Storage is Microsoft's object storage solution for the cloud, optimized for storing massive amounts of unstructured data such as text or binary data. Blob Storage offers three resource types: storage accounts, containers, and blobs, where containers organize sets of blobs within a storage account. It supports three blob types: block blobs (optimized for streaming), append blobs (optimized for append operations), and page blobs (optimized for random read/write operations).

## Authentication

Azure Blob Storage supports several authentication methods:

### 1. Microsoft Entra ID (OAuth 2.0)

Microsoft Entra ID is Microsoft's cloud-based identity and access management service, available for the Blob, File, Queue, and Table services. With Microsoft Entra ID, you can assign fine-grained access to users, groups, or applications via role-based access control (RBAC).

To authenticate:

- Register an application in your Microsoft Entra ID tenant (Azure AD) to obtain a **Client ID** and **Client Secret** (or use certificate-based auth).
- Request tokens for Azure Storage by specifying the value `https://storage.azure.com/` for the resource ID.
- Obtain an OAuth 2.0 token from the Microsoft identity platform token endpoint: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
- Pass the access token in the `Authorization` header using the Bearer scheme, and specify a service version of `2017-11-09` or later.

Key RBAC roles for Blob Storage:

- **Storage Blob Data Contributor**: grants read/write/delete permissions to Blob storage resources.
- **Storage Blob Data Reader**: grants read-only permissions to Blob storage resources.
- **Storage Blob Data Owner**: full access including POSIX access control for Data Lake Storage Gen2.

### 2. Shared Key (Storage Account Key)

Shared Key authorization relies on your account access keys and other parameters to produce an encrypted signature string that is passed on the request in the Authorization header.

- Each storage account has two access keys (primary and secondary).
- The authorization header format is: `Authorization="SharedKey <storage account name>:<signature>"` where the signature is an HMAC created from the request using SHA256, then Base64-encoded.
- Required credentials: **Storage Account Name** and **Storage Account Key**.

### 3. Shared Access Signatures (SAS)

Shared access signatures delegate access to a particular resource in your account with specified permissions and over a specified time interval.

There are three types of SAS:

- **User Delegation SAS**: Secured with Microsoft Entra credentials instead of the account key, providing superior security. Supported for Blob Storage only.
- **Service SAS**: Delegates access to a resource in just one of the storage services (Blob, Queue, Table, or Files). Signed with the storage account key.
- **Account SAS**: Delegates access to resources in one or more of the storage services. Signed with the storage account key.

SAS tokens are appended as query parameters to the resource URI and include permissions, expiry time, and other constraints.

### 4. Anonymous Public Access

A public container or blob is accessible to any user for anonymous read access. Read requests to public containers and blobs do not require authorization. This must be explicitly enabled on the storage account and container.

## Features

### Container Management

Create, list, delete, and configure containers within a storage account. Containers organize blobs similar to directories. Containers and blobs support user-defined metadata in the form of name-value pairs. You can set access policies on containers and manage lease state for concurrency control.

### Blob Upload and Download

Upload, download, and delete blobs of any type (block, append, page). Block blobs support uploading in blocks for large files, while append blobs allow appending data without modifying existing content. You can read partial blob content using range requests. The API supports conditional update operations, which can be useful for concurrency control.

### Blob Copy

Copy blobs within the same storage account, across storage accounts, or from any accessible URL. Supports both synchronous (for smaller blobs) and asynchronous copy operations.

### Snapshots and Versioning

You can enable blob storage versioning to automatically maintain previous versions of an object. Snapshots provide read-only point-in-time copies of a blob. Both versioning and snapshots can be managed via lifecycle policies.

### Access Tiers

Azure Storage offers different access tiers to store blob data cost-effectively: Hot (frequently accessed, highest storage cost, lowest access cost), Cool (infrequently accessed, minimum 30-day retention), and Cold (rarely accessed, still requires fast retrieval). There is also an Archive tier for offline storage requiring rehydration before access.

- Access tiers can be set per-blob or as a default on the storage account.
- Tiering is allowed only on block blobs and not for append and page blobs.

### Lifecycle Management

Azure Blob Storage lifecycle management allows customers to optimize costs by implementing rule-based policies that automatically transition data to cooler tiers or expire it when it's no longer needed.

- Rules can be based on last modification time or last access time.
- Actions include transitioning tiers (hot → cool → cold → archive) and deleting blobs.
- Rules can apply to current versions, previous versions, and snapshots.
- Policies can transition current versions, previous versions, or blob snapshots to a cooler storage tier if these objects aren't accessed or modified for a period of time.

### Lease Management

The API includes support for leasing blobs and containers. Leases provide distributed lock functionality, useful for preventing concurrent modifications. Leases can be acquired, renewed, released, and broken.

### Blob Metadata and Properties

Set and retrieve system properties (content type, encoding, cache control, etc.) and custom metadata (key-value pairs) on both containers and blobs.

### Immutable Storage

Store blobs with write-once-read-many (WORM) policies. Supports time-based retention and legal hold policies for compliance scenarios. The delete action of a lifecycle management policy won't work with any blob in an immutable container — objects can be created and read, but not modified or deleted.

## Events

Azure Blob Storage supports event-driven notifications through **Azure Event Grid**. Azure Blob Storage supports webhooks through Azure Event Grid, with events pushed to subscribers such as Azure Functions, Azure Logic Apps, or custom HTTP listeners.

- Only storage accounts of kind StorageV2 (general purpose v2), BlockBlobStorage, and BlobStorage support event integration. Storage (general purpose v1) does not support integration with Event Grid.
- Events can be filtered by event type, container name, or name of the object that was created/deleted.
- Event subscriptions are created via the Azure Event Grid API, specifying a webhook endpoint URL and the event types to subscribe to.
- When Azure Event Grid creates a webhook subscription, it sends a subscription validation event to verify the endpoint, and the endpoint needs to respond with a specific validation response.

### Blob Lifecycle Events

Azure Blob Storage emits the following event types through Event Grid:

- **BlobCreated** (`Microsoft.Storage.BlobCreated`): Fired when a new blob is created or an existing blob is replaced.
- **BlobDeleted** (`Microsoft.Storage.BlobDeleted`): Fired when a blob is deleted.
- **BlobTierChanged** (`Microsoft.Storage.BlobTierChanged`): Fired when the blob access tier is changed.
- **BlobRenamed** (`Microsoft.Storage.BlobRenamed`): Fired when a blob is renamed (Data Lake Storage Gen2 only).

### Directory Events (Data Lake Storage Gen2 only)

- **DirectoryCreated** (`Microsoft.Storage.DirectoryCreated`): Fired when a directory is created.
- **DirectoryRenamed** (`Microsoft.Storage.DirectoryRenamed`): Fired when a directory is renamed.
- **DirectoryDeleted** (`Microsoft.Storage.DirectoryDeleted`): Fired when a directory is deleted.

### Lifecycle Policy Events

- **LifecyclePolicyCompleted** (`Microsoft.Storage.LifecyclePolicyCompleted`): Fired when a lifecycle management policy run completes, including summary data about tier transitions and deletions.

### SFTP Events

Events are triggered when a hierarchical namespace is enabled on the storage account and clients use SFTP APIs. These produce the same event types (e.g., BlobCreated) but with SFTP-specific API values in the event data.
