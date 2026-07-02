# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> AWS S3

Store, retrieve, and manage objects in Amazon S3 buckets. Upload and download text objects, create and delete buckets, generate presigned URLs, copy and delete objects, manage object versions, configure bucket policies and lifecycle rules, and tag objects and buckets.

## Tools

### Copy Object

Copy an object within or between S3 buckets. Can copy to a different key in the same bucket or to a different bucket entirely. Optionally replace metadata during copy.

### Delete Objects

Delete one or more objects from an S3 bucket. Supports deleting specific versions of versioned objects. For batch deletion, provide up to 1000 objects.

### Generate Presigned URL

Generate a temporary signed URL for S3 object downloads or uploads. URLs can be valid for up to seven days.

### Get Bucket Info

Retrieve bucket location, versioning status, tags, and bucket policy details.

### Get Object

Download an object as text or retrieve object metadata with a HEAD request. Supports byte ranges and version IDs.

### List Buckets

List S3 buckets in the AWS account.

### List Object Versions

List object versions and delete markers in a bucket.

### List Objects

List objects in a bucket with prefix, delimiter, pagination, and start-after options.

### Manage Bucket

Create or delete a bucket, and enable or suspend bucket versioning.

### Manage Bucket Lifecycle

Get, replace, or delete lifecycle configuration rules for expiration, storage-class transitions, noncurrent versions, and incomplete multipart uploads.

### Manage Bucket Policy

Get, put, or delete the JSON policy attached to a bucket.

### Manage Bucket Tags

Get, replace, or delete bucket tags.

### Manage Object Tags

Get, replace, or delete tags on an object or object version.

### Put Object

Upload a text object with optional content type, storage class, encryption header, ACL, tags, and custom metadata.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
