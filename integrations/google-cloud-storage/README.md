# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Cloud Storage

Store, retrieve, and manage unstructured data as objects in Google Cloud Storage buckets. Create, configure, list, and delete buckets with geographic location and storage class settings. Upload, download, copy, move, and delete objects with support for resumable and multipart uploads. Control access via IAM roles, ACLs, and signed URLs. Configure object lifecycle rules to automatically transition storage classes or delete objects based on age or access patterns. Enable object versioning, retention policies, and soft delete for data protection. Set up Pub/Sub notifications for object change events (create, update, delete, archive). Manage encryption with Google-managed, customer-managed (CMEK), or customer-supplied (CSEK) keys. Host static websites and interoperate with Amazon S3 via the XML API.

## Tools

### Copy Object

Copy an object within or between Cloud Storage buckets. The source object remains unchanged. Can also be used to rename or move an object by setting **deleteSource** to true.

### Delete Object

Permanently delete an object from a Cloud Storage bucket. Optionally specify a generation number to delete a specific version of a versioned object.

### Get Bucket

Get detailed information about a Cloud Storage bucket including its location, storage class, versioning status, lifecycle rules, website configuration, labels, and encryption settings.

### Get Object

Get an object's metadata and optionally download its content from a Cloud Storage bucket. By default only returns metadata; set **includeContent** to true to download the object's data as text.

### List Buckets

List Cloud Storage buckets in the configured project. Supports filtering by name prefix and pagination for large result sets.

### List Objects

List objects in a Cloud Storage bucket. Supports filtering by name prefix, delimiter-based folder simulation, and listing all object versions.

### Manage Bucket IAM

Get or set IAM policies on a Cloud Storage bucket. Use **action: "get"** to retrieve the current policy, or **action: "set"** to replace the entire policy with the provided bindings. Use **action: "add_binding"** or **action: "remove_binding"** to modify individual bindings without replacing the full policy.

### Manage Bucket

Create, update, or delete a Cloud Storage bucket. When creating, specify a name and optionally a location, storage class, and versioning. When updating, provide any fields to modify. When deleting, the bucket must be empty.

### Manage Lifecycle Rules

Get or set lifecycle management rules on a Cloud Storage bucket. Lifecycle rules automate storage class transitions, object deletion, and cleanup of incomplete uploads based on configurable conditions.

### Manage Pub/Sub Notifications

List, create, or delete Pub/Sub notification configurations on a Cloud Storage bucket. Notifications deliver event messages to a Pub/Sub topic when objects are created, updated, deleted, or archived.

### Update Object Metadata

Update metadata on an existing object in a Cloud Storage bucket. Supports changing content type, content disposition, cache control, custom metadata, and object holds.

### Upload Object

Upload a new object to a Cloud Storage bucket or overwrite an existing one. Provide the object name (path) and its text content. Optionally attach custom metadata key-value pairs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
