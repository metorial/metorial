# Slates Specification for AWS SQS

## Overview

Amazon Simple Queue Service (Amazon SQS) is a hosted queue service that lets you integrate and decouple distributed software systems and components. It stores messages on multiple servers for durability, supporting standard queues with at-least-once delivery and FIFO queues with exactly-once processing. Users can create unlimited queues with unlimited messages in any AWS region, with message payloads up to 1 MiB in any supported text format.

## Authentication

AWS SQS uses AWS's standard authentication model based on IAM credentials. All API requests must be signed using AWS Signature Version 4.

**Required credentials:**

- **AWS Access Key ID**: Identifies the AWS account making the request.
- **AWS Secret Access Key**: Used to calculate the HMAC-SHA signature for request signing.
- **AWS Region**: The region where the SQS queue resides (e.g., `us-east-1`). The endpoint format is `sqs.<region>.amazonaws.com`.

**Temporary credentials (optional):**

IAM allows you to grant temporary security credentials to any user, allowing the user to access your AWS services and resources. When using temporary credentials (e.g., from AWS STS `AssumeRole`), an additional **Session Token** is required alongside the temporary Access Key ID and Secret Access Key.

Amazon SQS supports Signature Version 4, which provides improved SHA256-based security and performance over previous versions. When you create new applications that use Amazon SQS, use Signature Version 4.

**IAM permissions:**

You control access in AWS by creating policies and attaching them to AWS identities or resources. A policy defines permissions when associated with an identity or resource. The IAM user or role must have appropriate SQS permissions such as `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:CreateQueue`, `sqs:GetQueueAttributes`, etc.

## Features

### Queue Management

Create, configure, list, and delete message queues. Amazon SQS supports two types of queues: standard queues and FIFO queues. Standard queues provide maximum throughput with at-least-once delivery. FIFO queues deliver messages exactly once, and the order in which messages are sent and received is strictly preserved. Key configurable attributes include visibility timeout, message retention period, delay seconds, maximum message size, high-throughput FIFO settings, and encryption. You cannot rename a queue or convert between standard and FIFO types after creation.

### Sending Messages

Send messages to a queue with an optional delay. Messages can include a body (up to 1 MiB), custom message attributes (metadata), and for FIFO queues, a message group ID and deduplication ID. For larger payload workflows, use an extended-client pattern that stores payloads outside SQS, such as in Amazon S3.

### Receiving and Deleting Messages

Receive messages from a queue using short polling or long polling. Long polling reduces extraneous polling to minimize cost while receiving new messages as quickly as possible. While a message is being processed, it remains in the queue and isn't returned to subsequent receive requests for the duration of the visibility timeout. Consumers must explicitly delete messages after successful processing.

### Visibility Timeout Management

Change the visibility timeout of individual messages or batches of up to 10 messages after they have been received. This allows consumers to extend or shorten the processing window for specific messages. The default visibility timeout for a message is 30 seconds. The minimum is 0 seconds. The maximum is 12 hours.

### Dead-Letter Queues

Handle messages that a consumer has not successfully processed with dead-letter queues (DLQs). When a message's maximum receive count is exceeded, Amazon SQS moves the message to the DLQ associated with the original queue. Configure a redrive policy specifying the DLQ ARN and `maxReceiveCount`. Amazon SQS also offers a dead-letter queue redrive feature, allowing you to move messages from a DLQ back to a source queue or another destination queue for reprocessing. The queue type must match the source queue type—a FIFO queue can only use a FIFO DLQ, and a standard queue can only use a standard DLQ.

### Queue Sharing and Permissions

Securely share Amazon SQS queues anonymously or with specific AWS accounts. Queue sharing can also be restricted by IP address and time-of-day. Add or remove permissions for specific AWS accounts to perform actions on the queue.

### Message Move Tasks

Start, list, and cancel message move tasks. This is used to move messages between queues, commonly from a dead-letter queue back to a source queue. The integration also lists source queues associated with a dead-letter queue to support DLQ audits.

### Server-Side Encryption

Protect the contents of messages using keys managed in AWS Key Management Service (KMS). SSE encrypts messages as soon as Amazon SQS receives them. The messages are stored in encrypted form and Amazon SQS decrypts messages only when they are sent to an authorized consumer. Supports both SQS-managed keys (SSE-SQS) and customer-managed KMS keys (SSE-KMS).

### Tagging

Apply cost allocation tags to queues for organizing and tracking costs across AWS resources.

## Events

AWS SQS does not natively support webhooks or push-based event subscriptions. It supports pull-based consumers, such as Amazon EC2 instances or Lambda functions, which actively retrieve messages from the queue.

However, SQS can serve as a **target** for events from other AWS services:

- Amazon EventBridge allows you to automate AWS services and respond to events in near real-time. You can create rules to filter specific events and define automated actions when a rule matches. EventBridge supports multiple targets, including Amazon SQS standard and FIFO queues, which receive events in JSON format.

SQS itself does not emit events or offer a webhook/event subscription mechanism for queue activity. Monitoring queue activity (such as messages sent, received, or moved to DLQ) is done through CloudWatch metrics and CloudTrail logging, not through an event subscription model.
