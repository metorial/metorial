# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Sns

Create and manage SNS topics (standard and FIFO) for pub/sub messaging. Publish messages to topics or directly to endpoints such as SMS phone numbers, email addresses, HTTP/HTTPS endpoints, SQS queues, Lambda functions, and mobile push devices. Subscribe and unsubscribe endpoints using various protocols. Configure message filtering policies so subscribers receive only relevant notifications. Send SMS text messages to 200+ countries. Manage mobile push platform applications and device endpoints for iOS, Android, and other platforms. Configure topic attributes including delivery policies, server-side encryption with KMS, and access policies. Archive and replay messages on FIFO topics for up to 365 days.

## Tools

### Confirm Subscription

Confirm a pending SNS subscription using the confirmation token. HTTP/S, email, and cross-account subscriptions require explicit confirmation before notifications are delivered. Tokens are valid for 2 days.

### Create Topic

Create a new SNS topic (standard or FIFO) for publishing messages to subscribers. Optionally configure display name, encryption, delivery policies, and tags. FIFO topic names must end with \

### Delete Topic

Delete an SNS topic and all its subscriptions. This action is idempotent; deleting a non-existent topic does not cause an error. Previously sent messages may not be delivered after deletion.

### Get Topic

Retrieve all attributes and tags for an SNS topic, including owner, display name, subscription counts, delivery policy, encryption settings, and FIFO configuration.

### List Subscriptions

List subscriptions, optionally filtered by a specific topic. Returns subscription details including protocol, endpoint, and owner. Each page returns up to 100 subscriptions.

### List Topics

List all SNS topics in the configured region. Returns topic ARNs with pagination support. Each page returns up to 100 topics.

### Publish Message

Publish a message to an SNS topic, directly to a phone number via SMS, or to a mobile platform endpoint. Supports protocol-specific messages via JSON message structure, message attributes, and FIFO topic ordering/deduplication.

### Send SMS

Send an SMS text message directly to a phone number via Amazon SNS. The phone number must be in E.164 format (e.g., +14155552671). Supports message attributes for SMS-specific settings like sender ID and message type.

### Subscribe to Topic

Subscribe an endpoint to an SNS topic. Supports SQS, HTTP/HTTPS, email, SMS, Lambda, Firehose, and mobile push protocols. Optionally configure filter policies, raw message delivery, and dead-letter queues.

### Unsubscribe from Topic

Remove a subscription from an SNS topic. Requires the subscription ARN. Only the subscription owner or topic owner can unsubscribe when authentication is required.

### Update Subscription

Update attributes of an existing SNS subscription. Configure filter policies, raw message delivery, delivery retry policies, or dead-letter queue settings.

### Update Topic

Update attributes and/or tags of an SNS topic. Set any combination of display name, delivery policy, access policy, encryption, tracing, and FIFO-specific settings. Tags can be added or removed independently.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
