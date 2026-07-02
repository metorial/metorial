# Slates Specification for AWS Lambda

## Overview

AWS Lambda is a serverless compute service from Amazon Web Services that runs code in response to events without requiring server provisioning or management. It automatically scales execution and uses pay-per-use pricing. The Lambda API allows managing functions, layers, event source mappings, aliases, versions, concurrency settings, and invoking functions programmatically.

## Authentication

AWS Lambda uses **IAM-based authentication** exclusively. All API requests must be authenticated using AWS credentials.

**AWS Signature Version 4 (SigV4)**

AWS Signature Version 4 (SigV4) is the AWS signing protocol for adding authentication information to AWS API requests. Every request to the Lambda API must be signed using this protocol.

Required credentials:

- **AWS Access Key ID**: Identifies the IAM user or role making the request.
- **AWS Secret Access Key**: Used to compute the request signature.
- **AWS Session Token** (optional): Required when using temporary credentials from AWS STS (Security Token Service), assumed roles, or federated identities.

Signing requests involves creating a canonical request based on the request details, calculating a signature using your AWS credentials, and adding this signature to the request as an Authorization header.

Credentials can be obtained in several ways:

- **IAM User**: Long-term access key ID and secret access key created in the IAM console.
- **IAM Role (assumed via STS)**: Temporary credentials obtained via `sts:AssumeRole`, commonly used for cross-account access or applications running on AWS infrastructure (EC2, ECS, Lambda).
- **Federated Identity**: A federated identity is a user from your enterprise directory, web identity provider, or Directory Service that accesses AWS services using credentials from an identity source. Federated identities assume roles that provide temporary credentials.

The API endpoint follows the pattern: `https://lambda.{region}.amazonaws.com`. The region must also be specified as part of the signing process.

**Permissions**: Access to specific Lambda actions is controlled via IAM policies. You control access by creating policies and attaching them to AWS identities or resources. A policy defines permissions when associated with an identity or resource. Lambda actions are prefixed with `lambda:` (e.g., `lambda:InvokeFunction`, `lambda:CreateFunction`).

## Features

### Function Management

Create, update, configure, and delete Lambda functions. You can upload function code as a ZIP archive or a container image, set runtime and handler configurations, assign execution roles, configure environment variables, memory, timeout, and VPC networking. Environment variables modify application behavior without new code deployments. Versions safely test new features while maintaining stable production environments.

### Function Invocation

Invoke Lambda functions synchronously (RequestResponse) or asynchronously (Event). Synchronous invocation returns the function result in the response. Asynchronous invocation queues the event and returns immediately.

### Versions and Aliases

Publish immutable versions of functions and create aliases that point to specific versions. Aliases support weighted traffic shifting between two versions, enabling canary or blue/green deployment patterns.

### Layers

A Lambda layer is a .zip file archive that contains supplementary code or data. Layers usually contain library dependencies, a custom runtime, or configuration files. You can publish, version, and share layers across functions and AWS accounts. You can include up to five layers per function.

### Event Source Mappings

Connect Lambda functions to streaming or queue-based AWS services so Lambda automatically polls for and processes events. With event source mapping, Lambda actively fetches (or pulls) events from a queue or stream. You configure Lambda to check for events from a supported service, and Lambda handles the polling and invocation of your function. Supported sources include SQS, Kinesis, DynamoDB Streams, Apache Kafka, and Amazon MQ.

### Function URLs

Function URLs create public-facing APIs and endpoints without additional services. Each function URL provides a dedicated HTTPS endpoint. Auth type can be set to `AWS_IAM` (SigV4-signed requests) or `NONE` (open access). CORS can be configured on the URL.

### Concurrency and Scaling

Configure reserved concurrency to guarantee a function always has access to a set amount of concurrency. Provisioned concurrency keeps a specified number of execution environments initialized to reduce cold starts. Scaling configuration allows controlling how quickly functions scale up.

### Asynchronous Invocation Configuration

Configure how Lambda handles asynchronous invocations, including maximum retry attempts, maximum event age, and destination routing for successful or failed invocations (to SQS, SNS, Lambda, S3, or EventBridge).

### Runtime Management

Control whether Lambda applies runtime patches automatically, only when the function is updated, or through a pinned manual runtime version ARN.

### Recursive Loop Detection

Read and configure Lambda's recursive loop detection behavior. The default `Terminate` mode stops detected recursive invocation loops; `Allow` should be reserved for intentional recursive designs with guardrails.

### Permissions Management

Manage resource-based policies on functions and layers. Add or remove permission statements that grant other AWS accounts or services the ability to invoke functions or use layers.

### Tagging

Apply key-value tags to Lambda functions for organization, cost tracking, and access control purposes.

### Durable Executions

Manage long-running, stateful workflows via durable functions. You can checkpoint, inspect history and state, stop executions, and send callback signals for human-in-the-loop or asynchronous task patterns.

## Events

The provider does not support webhooks or event subscriptions via the Lambda API itself. Lambda functions are _consumers_ of events from other AWS services (S3, API Gateway, EventBridge, etc.), but the Lambda management API does not provide a webhook or subscription mechanism to notify external systems about changes to Lambda resources.

To monitor changes to Lambda resources (e.g., function creation, updates, deletions), you would use **AWS CloudTrail** combined with **Amazon EventBridge**, which can capture Lambda API calls as events and route them to targets. However, this is not a built-in feature of the Lambda API itself.
