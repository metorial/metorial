# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Sqs

Create, configure, list, and delete message queues (standard and FIFO). Send messages to queues with optional delays and custom attributes. Receive and delete messages using short or long polling. Manage visibility timeouts for in-flight messages. Configure dead-letter queues and redrive policies to handle failed message processing. Move messages between queues (e.g., from dead-letter queues back to source queues). Manage queue permissions for cross-account access. Enable server-side encryption with KMS or SQS-managed keys. Apply cost allocation tags to queues for tracking.

## Tools

### Change Message Visibility

Change the visibility timeout of a received message. Use this to extend the processing window when you need more time, or to make the message immediately available again by setting the timeout to 0.

### Create Queue

Create a new standard or FIFO SQS queue with optional configuration attributes and tags. Returns the URL of the newly created queue. If a queue with the same name and identical attributes already exists, its URL is returned without creating a duplicate.

### Delete Message

Delete a message from an SQS queue using its receipt handle. Messages should be deleted after successful processing to prevent redelivery. Supports deleting a single message or a batch of up to 10 messages.

### Delete Queue

Permanently delete an SQS queue and all its messages. The deletion process takes up to 60 seconds, during which the queue is not accessible.

### Get Queue URL

Look up the URL of an SQS queue by its name. Useful when you know the queue name but need the full URL for other operations. Can also look up queues owned by other AWS accounts.

### List Queues

List SQS queues in the configured AWS region. Optionally filter by queue name prefix and paginate through results.

### Manage Message Move Task

Start, list, or cancel message move tasks. Message move tasks are used to move messages from a dead-letter queue back to its source queue or to another destination queue for reprocessing.

### Manage Queue

Get or update SQS queue attributes, and manage queue tags. Use this to inspect queue configuration, modify settings like visibility timeout, configure dead-letter queues, enable encryption, or manage cost allocation tags.

### Purge Queue

Delete all messages from an SQS queue, including in-flight messages. The purge process takes up to 60 seconds. Messages sent before the purge are deleted; messages sent during purge may also be deleted.

### Receive Messages

Receive one or more messages from an SQS queue. Supports short polling (immediate return) and long polling (waits for messages). Received messages become invisible for the visibility timeout duration and must be explicitly deleted after processing.

### Send Message Batch

Send up to 10 messages to an SQS queue in a single batch request. Each message can have its own body, delay, and attributes. Returns results for both successful and failed entries.

### Send Message

Send a message to an SQS queue. Supports optional delay, custom message attributes, and FIFO queue parameters (message group ID and deduplication ID).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
