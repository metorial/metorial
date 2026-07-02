# Slates Specification for AWS SNS

## Overview

Amazon Simple Notification Service (SNS) is a fully managed pub/sub messaging service that enables application-to-application (A2A) and application-to-person (A2P) message delivery. Messages can be delivered to A2A endpoints (Amazon SQS, Amazon Data Firehose, AWS Lambda, HTTPS) as well as A2P endpoints (SMS, mobile push, and email). It supports both standard topics for high-throughput messaging and FIFO topics for strict ordering and deduplication.

## Authentication

AWS SNS uses the standard AWS authentication model. All API requests must be authenticated using **AWS Signature Version 4 (SigV4)**.

**Required credentials:**

- **AWS Access Key ID** – Identifies the IAM user or role making the request.
- **Secret Access Key** – Used to derive the signing key for request signatures.
- **AWS Region** – The region where your SNS resources are located (e.g., `us-east-1`). The API endpoint follows the pattern `sns.<region>.amazonaws.com`.

**Optional credentials:**

- **Session Token** (`X-Amz-Security-Token`) – Required when using temporary security credentials obtained via AWS STS (e.g., when assuming an IAM role).

For programmatic access, AWS provides an SDK and CLI to cryptographically sign requests. If you use the AWS SDKs or AWS CLI to send your requests, you don't need to manually sign requests because these tools authenticate your requests by using access keys that you provide.

**How it works:**
Authenticated requests require a signature that you create by using your access keys (access key ID, secret access key). You sign the request using the AWS Signature Version 4 process, which involves creating a canonical request, string-to-sign, and then calculating the signature.

**Access control:**
AWS Identity and Access Management (IAM) is used to control who can be authenticated and authorized to use Amazon SNS resources. IAM policies define which actions (e.g., `sns:Publish`, `sns:Subscribe`, `sns:CreateTopic`) a principal is allowed to perform. SNS also supports resource-based policies on topics to control cross-account access.

## Features

### Topic Management

Create and manage communication channels (topics) to which messages are published and subscribers listen. Each account can support 100,000 Standard topics and each topic supports up to 12.5M subscriptions. Topics can be tagged, and their attributes (delivery policies, encryption settings, access policies) can be configured.

### FIFO Topics

FIFO topics are designed to enhance messaging between applications when the order of operations and events is critical, or where duplicates can't be tolerated. Messages are grouped using a MessageGroupId and deduplicated either via content-based hashing or an explicit MessageDeduplicationId. SNS FIFO topics only support SQS queues as subscription endpoints — they cannot deliver to HTTP/S, email, SMS, or mobile push endpoints. Each account can support 1,000 FIFO topics and each topic supports up to 100 subscriptions.

### Message Publishing

Publish messages to topics or directly to specific endpoints (phone numbers, platform endpoints). Each message can contain up to 256KB of data. You can set MessageStructure to JSON to send a different message for each protocol, e.g., a short message to SMS subscribers and a longer message to email subscribers. Messages can include custom message attributes for metadata.

### Subscription Management

Subscribe endpoints to topics using various protocols. Supported protocols include SQS queues, HTTP/HTTPS endpoints, email (text or JSON), and SMS. Additionally, AWS Lambda functions and Amazon Data Firehose delivery streams can be subscribed. If the endpoint type is HTTP/S or email, or if the endpoint and the topic are not in the same AWS account, the endpoint owner must confirm the subscription. Confirmation tokens are valid for two days.

### Message Filtering

Subscriber applications can create filter policies so they receive only the notifications they are interested in, offloading filtering logic from both publisher and subscriber applications. Filter policies support operators for numeric matching, prefix matching, and anything-but matching.

### SMS Messaging

Amazon SNS supports sending SMS text messages at scale to 200+ countries. You can control your originating identity by using a sender ID, long codes, or short codes, and use the SNS sandbox to validate SMS workloads before moving to production. SMS messages can be sent directly to a phone number or via a topic subscription.

### Mobile Push Notifications

Amazon SNS mobile notifications allow you to fan out mobile push notifications to iOS, Android, Fire, Windows, and Baidu devices. You create platform applications for supported push services (APNs, FCM, ADM, WNS, etc.) and register device endpoints to receive messages.

### Message Archiving and Replay

For FIFO topics, Amazon SNS offers an in-place option to store and replay messages without provisioning a separate archival resource, improving durability and helping recover from downstream failure scenarios. SNS FIFO topics support an in-place, no-code, message archive that lets topic owners store messages published to a topic for up to 365 days.

### Server-Side Encryption

SNS supports HTTPS, and encryption at rest with KMS keys. Topics can be configured with an AWS KMS customer master key to encrypt all messages stored by SNS.

## Events

AWS SNS is itself an event delivery system rather than a provider of webhook/event subscription APIs. However, it supports HTTP/HTTPS subscriptions, which function as outbound webhooks.

### HTTP/HTTPS Endpoint Notifications

You can use Amazon SNS to send notification messages to one or more HTTP or HTTPS endpoints. When you subscribe an endpoint to a topic, you can publish a notification to the topic and Amazon SNS sends an HTTP POST request delivering the contents of the notification to the subscribed endpoint.

- When an HTTP/HTTPS subscription is created, SNS sends a subscription confirmation request to the endpoint, which must be acknowledged before notifications are delivered.
- The notification payload is a JSON document containing the message, topic ARN, message ID, timestamp, and a cryptographic signature for verification.
- Delivery retry policies can be configured to control how SNS retries failed deliveries.
- Basic and Digest Access Authentication is supported, allowing you to specify a username and password in the HTTPS URL.

### Platform Application Events

When configuring mobile push platform applications, SNS can be configured to publish delivery status events (success/failure) for push notification deliveries. These events can be directed to CloudWatch Logs for monitoring.
