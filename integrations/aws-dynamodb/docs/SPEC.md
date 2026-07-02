# Slates Specification for AWS DynamoDB

## Overview

Amazon DynamoDB is a fully managed NoSQL database service on AWS that supports key-value and document data models. It provides single-digit millisecond performance at any scale with automatic scaling, and offers features like transactions, global tables, streams, backups, and secondary indexes.

## Authentication

Access to DynamoDB is secured using IAM (Identity and Access Management). You need a valid AWS Identity to authenticate your requests, and that identity must have sufficient permissions to access DynamoDB resources.

The DynamoDB low-level API is a protocol-level interface where every HTTP(S) request must be correctly formatted and carry a valid digital signature. The Authorization header contains information required for DynamoDB to authenticate the request, using AWS Signature Version 4 (SigV4).

**Required credentials:**

- **Access Key ID** (`AWS_ACCESS_KEY_ID`): Identifies the IAM user or role making the request.
- **Secret Access Key** (`AWS_SECRET_ACCESS_KEY`): Used to compute the request signature.
- **Region** (`AWS_REGION`): The AWS region where your DynamoDB tables are located (e.g., `us-east-1`). The endpoint for DynamoDB in a given region follows the pattern `dynamodb.<region>.amazonaws.com`.
- **Session Token** (`AWS_SESSION_TOKEN`, optional): Required when using temporary security credentials provided by AWS Security Token Service (AWS STS).

**Authentication methods:**

1. **Long-term credentials (IAM User):** Using an IAM user with a pair of access and secret keys.

2. **Temporary credentials (IAM Role / STS):** Using an IAM role which provides temporary security credentials and is a more secure option. Temporary credentials include an access key ID, secret access key, and a session token. They are obtained via AWS STS operations like `AssumeRole`, `AssumeRoleWithSAML`, or `AssumeRoleWithWebIdentity`.

You control access by creating IAM policies and attaching them to AWS identities or resources. A policy defines permissions when associated with an identity or resource. Permissions are defined at the action level (e.g., `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query`) and can be scoped to specific table ARNs.

## Features

### Table Management

Create, update, describe, list, and delete DynamoDB tables. Tables require a primary key (partition key, and optionally a sort key). You can configure capacity mode (on-demand or provisioned throughput) and table class (Standard or Standard-IA for infrequently accessed data).

### Item Operations (CRUD)

You can use PartiQL (a SQL-compatible query language) or DynamoDB's classic CRUD APIs to perform data operations. This includes creating, reading, updating, and deleting individual items by primary key. UpdateItem allows modifying specific attributes of an existing item using expressions, while PutItem replaces the entire item. Conditional expressions can be used to perform writes only when certain conditions are met.

### Querying and Scanning

Query retrieves items that share the same partition key, with optional sort key conditions and filter expressions. Scan reads every item in a table or index and can apply filters. Both support projection expressions to return only specific attributes.

### Secondary Indexes

Local Secondary Indexes (LSIs) and Global Secondary Indexes (GSIs) enable querying data using alternative key schemas. LSIs share the same partition key as the table but use a different sort key. GSIs can have entirely different partition and sort keys.

### Transactions

Transactions allow CRUD operations on multiple items both within and across tables with guaranteed all-or-nothing results, for both reads (TransactGetItems) and writes (TransactWriteItems).

### Global Tables

Global tables provide active-active replication across your choice of AWS Regions with 99.999% availability. They are multi-active, meaning you can read and write from any replica.

### Backup and Restore

Point-in-Time Recovery (PITR) automatically provides continuous backups with per-second granularity so that you can restore to any given second within a configurable recovery period between 1 and 35 days. On-demand backups can also be created and restored at any time.

### Import and Export

Bulk import and export capabilities provide a way to move data between Amazon S3 and DynamoDB tables without writing any code. Useful for migrations, data sharing across accounts/regions, and analytics.

### Time to Live (TTL)

Automatically delete items after a specified expiration timestamp. Useful for managing session data, temporary records, or implementing data retention policies.

### PartiQL Support

You can use PartiQL, a SQL-compatible query language, to perform CRUD operations using familiar SQL-like syntax rather than the native DynamoDB JSON API format.

## Events

DynamoDB does not have built-in webhook functionality. It is primarily a database service and does not natively provide webhook capabilities. However, it does provide a purpose-built change data capture mechanism:

### DynamoDB Streams

DynamoDB Streams is a combination of change data capture on your DynamoDB table with a stream-based mechanism for processing those events. Once enabled, whenever you perform a write operation to a DynamoDB table (put, update, or delete), a corresponding event containing information about what changed is saved to the stream in near-real time.

- **Event types:** INSERT (new item created), MODIFY (existing item updated), DELETE (item removed).
- **Stream View Types** determine what data is included in each event record:
  - `KEYS_ONLY`: Only the item keys (partition key, sort key) are available.
  - `NEW_IMAGE`: The entire item after changes have been applied.
  - `OLD_IMAGE`: The entire item before any changes have been applied.
  - `NEW_AND_OLD_IMAGES`: The item both before and after changes.
- Events are stored for up to 24 hours.
- DynamoDB is integrated with AWS Lambda so that you can create triggers that automatically respond to events in DynamoDB Streams, building applications that react to data modifications.
- Lambda event source mappings support filtering, which is useful if you want to process only a subset of events, such as only deletions or updates to a specific entity type.
