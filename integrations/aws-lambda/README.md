# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Lambda

Create, update, configure, and delete serverless Lambda functions. Invoke functions synchronously or asynchronously. Manage function code deployment via ZIP archives or container images. Publish immutable function versions and create aliases with weighted traffic shifting for canary and blue/green deployments. Create and manage layers for shared code, dependencies, and runtimes. Configure event source mappings to poll events from SQS, Kinesis, DynamoDB Streams, Kafka, and Amazon MQ. Set up function URLs as dedicated HTTPS endpoints. Manage concurrency settings including reserved and provisioned concurrency. Configure asynchronous invocation retry behavior and destination routing. Manage resource-based permissions policies, tags, runtime update mode, recursive loop detection, and durable execution workflows.

## Tools

### Configure Async Invocation

List, get, set, update, or remove the asynchronous invocation configuration for a Lambda function. Controls retry behavior, maximum event age, and destination routing for successful or failed invocations (to SQS, SNS, Lambda, S3, or EventBridge).

### Create Function

Create a new Lambda function. Provide the function code via an S3 location, container image URI, or base64-encoded ZIP file. Requires a function name and an IAM execution role ARN at minimum.

### Delete Function

Delete a Lambda function. Optionally specify a **qualifier** to delete only a specific version (not \

### Get Account Settings

Retrieve Lambda account-level settings and limits for the configured region, including concurrent execution limits, code storage usage, and total code size.

### Get Function

Retrieve detailed information about a Lambda function including its configuration, code location, concurrency settings, and tags. Supports fetching a specific version or alias using the **qualifier** parameter.

### Invoke Function

Invoke a Lambda function synchronously or asynchronously. **Synchronous** (RequestResponse) returns the function's output. **Asynchronous** (Event) queues the event and returns immediately. Use **DryRun** to validate permissions without executing.

### List Functions

List Lambda functions in the configured AWS region. Returns function names, ARNs, runtimes, and key configuration. Use **maxItems** to control page size and **marker** for pagination.

### Manage Alias

Create, update, get, delete, or list aliases for a Lambda function. Aliases are named pointers to function versions, enabling canary and blue/green deployments via weighted traffic shifting.

### Manage Concurrency

Configure reserved and provisioned concurrency for a Lambda function. **Reserved concurrency** guarantees a set amount of concurrent executions. **Provisioned concurrency** keeps execution environments warm to eliminate cold starts.

### Manage Durable Execution

Inspect, list, stop, or send callbacks for Lambda durable executions. Durable executions are long-running, stateful workflows that can be checkpointed and resumed. Supports viewing execution history, state, and sending callback signals for human-in-the-loop patterns.

### Manage Event Source Mapping

Create, update, get, delete, or list event source mappings that connect Lambda to streaming/queue services (SQS, Kinesis, DynamoDB Streams, Kafka, Amazon MQ). Lambda automatically polls the source and invokes the function.

### Manage Function URL

Create, update, get, or delete a dedicated HTTPS endpoint (function URL) for a Lambda function. Function URLs provide public API access without needing API Gateway. Supports IAM authentication or open access, and configurable CORS.

### Manage Layer

Publish, get, delete, or list Lambda layers and their versions. Layers are reusable packages of libraries, dependencies, or custom runtimes that can be attached to functions.

### Manage Permission

Add, remove, or view resource-based policy statements on a Lambda function. These policies grant other AWS accounts or services (e.g., S3, API Gateway, EventBridge) permission to invoke the function.

### Manage Recursion Config

Get or set recursive loop detection for a Lambda function. Lambda defaults to terminating detected recursive invocation loops; only use Allow for intentional recursive designs with safeguards.

### Manage Runtime Management

Get or set the runtime update mode for a Lambda function version. Runtime management controls whether Lambda applies runtime patches automatically, on function updates, or pins a manual runtime version ARN.

### Manage Tags

List, add, or remove tags on a Lambda function. Tags are key-value pairs used for organization, cost allocation, and access control. Provide the full function ARN for tag operations.

### Publish Version

Publish an immutable version from the current \

### Update Function

Update a Lambda function's code and/or configuration. Provide **code** fields to update the deployment package, or **configuration** fields to modify settings like runtime, handler, memory, timeout, environment variables, layers, and VPC. Both can be updated in a single call.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
