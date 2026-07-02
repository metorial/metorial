# Slates Specification for Amazon Web Services

## Overview

Amazon Web Services (AWS) is a cloud computing platform offering over 200 services including compute (EC2, Lambda), storage (S3), databases (RDS, DynamoDB), networking, AI/ML, analytics, and more. All AWS services are accessible via REST APIs, with service-specific endpoints following the pattern `{service}.{region}.amazonaws.com`. AWS is organized by regions and accounts, with fine-grained access control managed through IAM (Identity and Access Management).

## Authentication

### AWS Signature Version 4 (SigV4)

AWS Signature Version 4 (SigV4) is the primary process for adding authentication information to AWS API requests sent over HTTP. For security, most requests to AWS must be signed with an access key, which consists of an access key ID and secret access key.

**Credentials required:**

- **Access Key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`) — identifies the IAM principal making the request.
- **Secret Access Key** — used to derive a signing key for the request signature.
- **Region** — the AWS region for the target service (e.g., `us-east-1`).
- **Service name** — the AWS service identifier (e.g., `s3`, `ec2`, `lambda`).

**How it works:**

You can use the AWS SigV4 signing protocol to create a signed request for AWS API requests. Creating a canonical request based on the request details. Calculating a signature using your AWS credentials. Adding this signature to the request as an Authorization header. AWS then replicates this process and verifies the signature, granting or denying access accordingly.

The Authorization header follows this format:

```
Authorization: AWS4-HMAC-SHA256 Credential={access_key_id}/{date}/{region}/{service}/aws4_request, SignedHeaders={signed_headers}, Signature={signature}
```

It is used behind the scenes by the AWS Command Line Interface (AWS CLI) and the AWS SDKs. AWS Signature v4 is very convenient: the signature is built in the SDKs provided by AWS and is automatically computed on the caller's behalf.

### Temporary Security Credentials (AWS STS)

You can use the AWS Security Token Service (AWS STS) to create and provide trusted users with temporary security credentials that can control access to your AWS resources.

The AWS STS API operations create a new session with temporary security credentials that include an access key pair and a session token. The access key pair consists of an access key ID and a secret key. Users (or an application that the user runs) can use these credentials to access your resources.

When using temporary credentials, the following are required:

- **Access Key ID** (temporary)
- **Secret Access Key** (temporary)
- **Session Token** — you must include the session token, which lets AWS verify that the temporary security credentials are valid.

Temporary security credentials are short-term, as the name implies. They can be configured to last for anywhere from a few minutes to several hours. After the credentials expire, AWS no longer recognizes them or allows any kind of access from API requests made with them.

Temporary credentials are obtained via STS operations such as `AssumeRole`, `AssumeRoleWithWebIdentity` (OIDC federation), `AssumeRoleWithSAML`, or `GetSessionToken`. These are then used with the same SigV4 signing process, with the session token included as an additional `X-Amz-Security-Token` header.

## Features

### Compute

AWS provides services for running code and managing servers. **EC2** allows launching, managing, and terminating virtual machine instances with configurable instance types, networking, and storage. **Lambda** enables running functions in response to events without managing servers, supporting multiple runtimes. **ECS/EKS** provide container orchestration via Docker and Kubernetes respectively. Key operations include creating/starting/stopping instances, deploying functions, and managing container clusters.

### Storage

**S3** provides object storage with bucket and key-based organization. You can create buckets, upload/download objects, manage object metadata, configure access policies, versioning, and lifecycle rules. **EBS** offers block storage volumes for EC2 instances. **EFS** provides managed file system storage. **Glacier** is for long-term archival storage.

### Databases

**RDS** offers managed relational databases (MySQL, PostgreSQL, SQL Server, etc.) with automated backups and scaling. **DynamoDB** is a fully managed NoSQL key-value and document database. **Redshift** provides data warehousing. **ElastiCache** offers managed in-memory caching (Redis, Memcached). Operations include creating/managing instances, configuring replication, and managing backups.

### Identity and Access Management (IAM)

Manage users, groups, roles, and policies that control access to AWS resources. You can create and manage IAM users and groups, define fine-grained permission policies, manage access keys, configure multi-factor authentication, and set up identity federation with external identity providers.

### Networking

**VPC** enables creating isolated virtual networks with subnets, route tables, and security groups. **Route 53** provides DNS management and domain registration. **CloudFront** is a content delivery network. **Elastic Load Balancing** distributes traffic across instances. **API Gateway** allows creating, publishing, and managing REST, HTTP, and WebSocket APIs.

### Messaging and Integration

**SNS** provides pub/sub messaging for fan-out notifications to multiple subscribers. **SQS** offers managed message queuing for decoupling services. **EventBridge** is a serverless event bus for routing events between AWS services, SaaS applications, and custom applications. **Step Functions** enables workflow orchestration for coordinating multiple services.

### Monitoring and Logging

**CloudWatch** enables monitoring AWS resources and applications via metrics, alarms, and dashboards. **CloudTrail** records AWS API calls for audit and governance. **CloudWatch Logs** allows centralized log collection and analysis. You can create alarms, define metric filters, and configure automated actions based on thresholds.

### AI and Machine Learning

**Bedrock** provides access to foundation models for generative AI. **SageMaker** offers a platform for building, training, and deploying ML models. **Rekognition**, **Comprehend**, **Translate**, **Polly**, and **Transcribe** provide specialized AI capabilities for image analysis, NLP, translation, text-to-speech, and speech-to-text respectively.

### Infrastructure as Code and Deployment

**CloudFormation** allows defining and provisioning infrastructure using templates. **CodeDeploy**, **CodeBuild**, and **CodePipeline** provide CI/CD capabilities. **Elastic Beanstalk** simplifies application deployment and scaling.

### Security

**KMS** manages encryption keys for data protection. **Secrets Manager** stores and rotates secrets like database credentials. **WAF** provides web application firewall protection. **GuardDuty** offers intelligent threat detection. **Security Hub** aggregates security findings across services.

## Events

AWS supports event-driven architectures primarily through **Amazon EventBridge**, which serves as the central event bus.

### AWS Service Events via EventBridge

Amazon EventBridge is a serverless event bus designed to make it easier to build event-driven architectures by allowing you to connect applications using data from various sources and route it to targets like AWS Lambda. EventBridge is directly integrated with over 130 event sources and over 35 targets.

Nearly all AWS services emit events to EventBridge automatically. You create **rules** with **event patterns** to match specific events and route them to targets. Key event categories include:

- **Resource State Changes**: Events emitted when AWS resources change state (e.g., EC2 instance state changes, S3 object creation/deletion, RDS instance status changes, ECS task state changes).
- **CloudWatch Alarm State Changes**: You can use EventBridge and these events to write rules that take actions, such as notifying you, when an alarm changes state.
- **API Call Events via CloudTrail**: Any AWS API call recorded by CloudTrail can trigger EventBridge rules, allowing you to react to management operations across all services.
- **Scheduled Events**: EventBridge supports cron and rate-based schedule expressions to trigger targets on a recurring basis.
- **Custom Application Events**: Applications can publish custom events to EventBridge event buses using the `PutEvents` API.

Configurable options include:

- **Event patterns**: Filter events by source, detail-type, and any field within the event payload using content-based filtering.
- **Event buses**: Use the default bus for AWS events, or create custom buses for application events. Partner event buses receive events from SaaS integrations.
- **Targets**: Route matched events to over 35 targets including Lambda, SQS, SNS, Step Functions, Kinesis, and HTTP endpoints.
- **Event archiving and replay**: Archive and replay events.
- **Input transformation**: Message transformation before sending to target.

### SNS Topic Notifications

Amazon SNS is a highly available, durable, and secure pub/sub messaging service that allows decoupled applications to communicate with each other using a publish-subscribe model. Many AWS services can publish notifications directly to SNS topics (e.g., CloudWatch alarms, S3 event notifications, CodePipeline state changes). Supports a wide range of subscribers, including HTTP/S endpoints, email, SMS, mobile push notifications, Lambda functions, and Amazon SQS queues.

### S3 Event Notifications

S3 can emit notifications when objects are created, deleted, or modified within a bucket. These can be delivered directly to SNS, SQS, Lambda, or EventBridge. Events can be filtered by object key prefix and suffix.
