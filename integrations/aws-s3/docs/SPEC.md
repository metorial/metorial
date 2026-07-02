Now let me get the full list of S3 event notification types:Now I have all the information needed to write the specification.

# Slates Specification for AWS S3

## Overview

Amazon Simple Storage Service (S3) is an object storage service by AWS that allows storing and retrieving any amount of data. The basic storage units are objects organized into buckets, where each object is identified by a unique, user-assigned key. The service is commonly used for data backup, content storage and distribution, and as a data lake for big data analytics.

## Authentication

Amazon S3 supports AWS Signature Version 4, a protocol for authenticating inbound API requests to AWS services, in all AWS Regions.

**Credentials Required:**

- Authenticated requests require a signature created using your access keys (access key ID and secret access key).
- If you are using temporary security credentials, the signature calculations also require a security token.

**Authentication Methods:**

1. **HTTP Authorization Header (primary method):** Using the HTTP Authorization header is the most common method of authenticating an Amazon S3 request. The header follows the format:

   ```
   Authorization: AWS4-HMAC-SHA256 Credential=<access-key-id>/<date>/<region>/s3/aws4_request, SignedHeaders=<headers>, Signature=<signature>
   ```

2. **Query String Parameters (presigned URLs):** You can use query parameters to provide request information including authentication information. Because the request signature is part of the URL, this type of URL is referred to as a presigned URL. Presigned URLs can be valid for up to seven days.

3. **POST-based browser uploads:** Amazon S3 supports browser-based uploads using HTTP POST requests, allowing you to upload content to S3 directly from the browser.

**IAM Permissions:**

You can have valid credentials to authenticate your requests, but unless you have S3 permissions from the account owner or bucket owner you cannot create or access Amazon S3 resources. These permissions are typically granted through an IAM policy, such as a bucket policy.

**Region:** The S3 API endpoint is region-specific. Requests must be signed with the correct region (e.g., `us-east-1`, `eu-west-1`). The endpoint format is `s3.<region>.amazonaws.com` or `<bucket>.s3.<region>.amazonaws.com` (virtual-hosted style).

## Features

### Bucket Management

Create, list, and delete buckets that serve as containers for objects. Buckets can be configured with region placement, access policies, versioning, logging, and lifecycle rules.

### Object Storage and Retrieval

Creating and managing buckets, uploading and downloading objects, copying objects between buckets, setting object permissions, and retrieving object metadata. Objects can be between 0 bytes and 5 TB. Objects larger than 5 GB must be uploaded via multipart upload.

### Presigned URLs

Generate presigned URLs that provide temporary access to specific S3 objects. This is useful for sharing private files without exposing credentials.

### Versioning

With S3 Versioning, you can preserve, retrieve, and restore every version of an object stored in Amazon S3, which allows you to recover from unintended user actions and application failures.

### Access Control

Access is controlled at the account, bucket, and object level. This includes bucket policies, ACLs, and IAM policies. S3 Block Public Access settings can prevent any public access to buckets and objects.

### Object Tagging and Metadata

When uploading objects, developers can include custom metadata to store additional information. Objects and buckets can be tagged with key-value pairs, enabling better organization and management. Tags can be used for cost allocation, access control, and automation.

### Lifecycle Management

Objects can be versioned and managed across multiple tiers of storage over the object lifetime. Lifecycle rules can automatically transition objects between storage classes (Standard, Intelligent-Tiering, Glacier, etc.) or expire objects after a defined period.

### Replication

With Amazon S3 Replication, you can replicate objects (and their respective metadata and object tags) to one or more destination buckets into the same or different Regions.

### Object Lock

You can enforce write-once-read-many (WORM) policies with Amazon S3 Object Lock. This feature blocks object version deletion during a customer-defined retention period so that you can enforce retention policies as an added layer of data protection or to meet compliance obligations. Supports Governance and Compliance modes.

### Server Access Logging

Get detailed records for the requests that are made to a bucket. You can use server access logs for security and access audits, learning about your customer base, and understanding your S3 bill.

### Static Website Hosting

Amazon S3 can be used to replace static web-hosting infrastructure with HTTP client-accessible objects, index document support, and error document support.

### Server-Side Encryption

Objects can be encrypted at rest using AWS-managed keys (SSE-S3), AWS KMS keys (SSE-KMS), or customer-provided keys (SSE-C).

## Events

You can use the Amazon S3 Event Notifications feature to receive notifications when certain events happen in your S3 bucket. You add a notification configuration that identifies the events to publish and the destinations where to send the notifications.

Event notifications are designed to be delivered at least once. Typically, they are delivered in seconds but can sometimes take a minute or longer.

Notifications can be sent to Amazon SNS topics, Amazon SQS queues, AWS Lambda functions, or Amazon EventBridge. You can optionally specify a prefix and a suffix to limit the notifications to objects with keys matching the specified characters.

### Object Created Events

Triggered when objects are created via PUT, POST, COPY, or multipart upload completion. Use `s3:ObjectCreated:*` as a wildcard for all creation events, or subscribe to specific sub-types (`Put`, `Post`, `Copy`, `CompleteMultipartUpload`).

### Object Removed Events

Triggered when objects are deleted or when delete markers are created for versioned objects. Use `s3:ObjectRemoved:*` as a wildcard, or subscribe to `Delete` or `DeleteMarkerCreated` specifically. Does not fire for automatic lifecycle deletes.

### Object Restore Events

Triggered when objects are restored from Glacier/archive storage classes. Includes initiation (`Post`), completion (`Completed`), and temporary copy expiration (`Delete`).

### Replication Events

Triggered for replication configurations with S3 Replication Time Control (S3 RTC) enabled. Covers replication failures, threshold exceeded, replicated after threshold, and operations no longer tracked.

### Lifecycle Events

Triggered when S3 Lifecycle transitions objects to another storage class (`s3:LifecycleTransition`) or expires/deletes objects (`s3:LifecycleExpiration:Delete`, `s3:LifecycleExpiration:DeleteMarkerCreated`).

### Intelligent-Tiering Events

Triggered when an object in the S3 Intelligent-Tiering storage class is moved to the Archive Access tier or Deep Archive Access tier.

### Object Tagging Events

Triggered when tags are added/updated (`s3:ObjectTagging:Put`) or removed (`s3:ObjectTagging:Delete`) from an object.

### Object ACL Events

Triggered when an ACL is PUT on an object or an existing ACL is changed (`s3:ObjectAcl:Put`). No event fires if the request results in no actual change.

### EventBridge Integration

As an alternative to SNS/SQS/Lambda destinations, you can enable Amazon EventBridge delivery for a bucket, which sends all events to EventBridge. EventBridge supports additional event types and allows routing events to a wider range of targets using rules and filters.
