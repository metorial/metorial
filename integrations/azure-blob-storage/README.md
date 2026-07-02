# <img src="https://provider-logos.metorial-cdn.com/azure-blob-storage.png" height="20"> Azure Blob Storage

Upload, download, copy, and delete blobs (block, append, page) in Azure cloud storage. Create and manage containers, set blob metadata and properties, and configure access tiers (Hot, Cool, Cold, Archive). Manage blob snapshots and versioning for point-in-time recovery. Apply lifecycle management policies to automatically transition blobs between tiers or expire data. Acquire and manage leases for concurrency control. Configure immutable storage with WORM policies for compliance. Subscribe to blob events (created, deleted, tier changed, renamed) via Azure Event Grid webhooks for event-driven workflows.

## Tools

### Append to Blob

Append content to an existing append blob. Append blobs are optimized for append operations like logging. The blob must already exist and be of type AppendBlob - create one first using the Upload Blob tool with blobType "AppendBlob".

### Copy Blob

Copy a blob from a source URL to a destination in the storage account. Supports copying within the same account, across accounts, or from any accessible URL. The copy operation runs asynchronously for large blobs.

### Create Blob Snapshot

Create a read-only snapshot of a blob at its current state. Snapshots capture a point-in-time copy that can be used for backup or versioning. Optionally set metadata on the snapshot.

### Delete Blob

Permanently delete a blob from a container. Can optionally delete associated snapshots. Use "include" to delete the blob and all its snapshots, or "only" to delete just the snapshots.

### Download Blob

Download the content of a blob. Supports partial content retrieval using byte range requests. Returns the blob content as text along with metadata.

### Get Blob Properties

Retrieve system properties and user-defined metadata for a blob without downloading its content. Returns content type, size, access tier, lease status, copy status, and custom metadata.

### Get Container Properties

Retrieve properties and metadata for a specific container. Returns system properties like lease status, public access level, and user-defined metadata.

### List Blobs

List blobs in a container. Supports filtering by prefix, hierarchical listing with delimiters, and pagination. Use the delimiter "/" to browse blobs like a folder structure.

### List Containers

List all containers in the Azure Blob Storage account. Supports filtering by name prefix and limiting the number of results returned.

### Manage Container

Create or delete a container in Azure Blob Storage. When creating, you can optionally set public access level and initial metadata. When deleting, the container and all its blobs are permanently removed.

### Manage Lease

Acquire, renew, release, or break a lease on a blob or container. Leases provide distributed lock functionality to prevent concurrent modifications. A lease can be finite (15-60 seconds) or infinite (-1).

### Set Blob Access Tier

Change the access tier of a block blob. Tiers control storage costs and access performance: Hot (frequent access), Cool (infrequent, 30-day minimum), Cold (rare access), or Archive (offline, requires rehydration).

### Set Container Metadata

Set user-defined metadata on a container. This replaces all existing metadata with the provided key-value pairs. To clear metadata, pass an empty object.

### Update Blob Properties

Update system properties and/or user-defined metadata on a blob. Properties include content type, encoding, language, disposition, and cache control. Metadata can be updated separately or together with properties.

### Upload Blob

Upload content as a blob to a container. Supports setting content type, access tier, metadata, and cache control. Creates a new blob or overwrites an existing one with the same name.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
