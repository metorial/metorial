# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws

Manage AWS cloud infrastructure and services. Launch, configure, and terminate EC2 instances. Deploy and invoke Lambda functions. Create and manage S3 buckets and objects with upload, download, versioning, and lifecycle policies. Provision and manage RDS relational databases and DynamoDB NoSQL tables. Configure VPCs, subnets, security groups, and load balancers. Manage IAM users, roles, and permission policies. Set up CloudWatch alarms, metrics, and dashboards for monitoring. Create SNS topics and SQS queues for messaging. Define CloudFormation stacks for infrastructure as code. Configure EventBridge rules to route events across services. Manage encryption keys with KMS and secrets with Secrets Manager. Access AI/ML services including Bedrock foundation models, SageMaker, Rekognition, Comprehend, Translate, Polly, and Transcribe. Set up CI/CD pipelines with CodePipeline, CodeBuild, and CodeDeploy. Manage container orchestration with ECS and EKS. Configure Route 53 DNS, CloudFront CDN, and API Gateway endpoints.

## Tools

### Manage CloudWatch

Manage Amazon CloudWatch metrics and alarms. Supports listing and describing alarms, creating or updating metric alarms, deleting alarms, publishing custom metric data, retrieving metric statistics, and listing available metrics. Use this to monitor AWS resources, configure alerting thresholds, and query time-series metric data.

### Manage DynamoDB

Manage AWS DynamoDB tables and items. Supports listing, describing, creating, and deleting tables, as well as putting, getting, updating, querying, scanning, and deleting items. Accepts plain JSON objects for items and keys -- automatic conversion to/from DynamoDB attribute format is handled internally.

### Manage EC2 Instances

List, start, stop, terminate, or reboot Amazon EC2 instances. Use the list operation to discover instances with filtering by IDs, states, or tags. Use action operations to control instance lifecycle.

### Manage IAM

Manage AWS IAM users, roles, and policy attachments. Supports listing, creating, and deleting users; listing, creating, deleting, and inspecting roles; and attaching or detaching managed policies to users and roles.

### Manage Lambda

Manage AWS Lambda functions: list functions, get details, invoke a function with a JSON payload, update configuration (memory, timeout, environment variables, layers, VPC, tracing), or delete a function. Set the **operation** field to choose the action.

### Manage S3

Manage Amazon S3 buckets and objects. Supports listing buckets, creating and deleting buckets, listing objects within a bucket, retrieving object metadata, deleting objects, and copying objects between locations. This tool covers S3 management operations — it does not handle binary upload or download.

### Manage SNS

Manage AWS SNS (Simple Notification Service) topics and subscriptions. Supports listing topics, creating and deleting topics, getting and setting topic attributes, publishing messages, listing subscriptions for a topic, subscribing endpoints (email, SQS, Lambda, HTTP/HTTPS), and unsubscribing. Set the **operation** field to choose the action.

### Manage SQS

Manage Amazon SQS (Simple Queue Service) queues and messages. Supports listing queues, resolving queue URLs, creating and deleting queues, sending and receiving messages, deleting messages, changing message visibility, retrieving and setting queue attributes, and purging all messages from a queue.

### Manage STS

Inspect the authenticated AWS Security Token Service identity. Use this to confirm which AWS account and principal the configured credentials resolve to before running account-level operations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
