# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Sns

Create and manage SNS topics (standard and FIFO) for pub/sub messaging. Publish messages or message batches to topics, directly to SMS phone numbers, or to existing mobile platform endpoints. Subscribe and unsubscribe endpoints using various protocols. Configure message filtering policies so subscribers receive only relevant notifications. Send SMS text messages, inspect SMS account status, manage SMS defaults, check opt-out status, and list origination numbers. Configure topic attributes including delivery policies, server-side encryption with KMS, FIFO throughput scope, access policies, archive policies, replay policies, and tags.

## Tools

### Confirm Subscription

Confirm a pending SNS subscription using the confirmation token. HTTP/S, email, and cross-account subscriptions require explicit confirmation before notifications are delivered. Tokens are valid for 2 days.

### Check SMS Opt Out

Check whether a phone number has opted out of receiving SMS messages from this AWS account. SNS cannot send SMS messages to opted-out phone numbers.

### Create Topic

Create a new SNS topic (standard or FIFO) for publishing messages to subscribers. Optionally configure display name, encryption, delivery policies, FIFO archive/throughput settings, and tags. FIFO topic names must end with `.fifo`.

### Delete Topic

Delete an SNS topic and all its subscriptions. This action is idempotent; deleting a non-existent topic does not cause an error. Previously sent messages may not be delivered after deletion.

### Get SMS Status

Retrieve SNS SMS account settings, SMS sandbox status, and the current page of phone numbers that are opted out of SMS delivery.

### Get Subscription

Retrieve all attributes for an SNS subscription, including topic, owner, filter policy, delivery policy, raw delivery mode, pending confirmation state, redrive policy, and FIFO replay status when present.

### Get Topic

Retrieve all attributes and tags for an SNS topic, including owner, display name, subscription counts, delivery policy, encryption settings, and FIFO configuration.

### List Origination Numbers

List dedicated SNS SMS origination numbers and their metadata for the configured AWS account and region.

### List Subscriptions

List subscriptions, optionally filtered by a specific topic. Returns subscription details including protocol, endpoint, and owner. Each page returns up to 100 subscriptions.

### List Topics

List all SNS topics in the configured region. Returns topic ARNs with pagination support. Each page returns up to 100 topics.

### Publish Batch

Publish up to 10 messages to a single SNS topic in one request. SNS reports success or failure for each individual batch entry.

### Publish Message

Publish a message to an SNS topic, directly to a phone number via SMS, or to a mobile platform endpoint. Supports protocol-specific messages via JSON message structure, message attributes, and FIFO topic ordering/deduplication.

### Send SMS

Send an SMS text message directly to a phone number via Amazon SNS. The phone number must be in E.164 format (e.g., +14155552671). Supports message attributes for SMS-specific settings like sender ID and message type.

### Subscribe to Topic

Subscribe an endpoint to an SNS topic. Supports SQS, HTTP/HTTPS, email, SMS, Lambda, Firehose, and mobile push protocols. Optionally configure filter policies, raw message delivery, and dead-letter queues.

### Unsubscribe from Topic

Remove a subscription from an SNS topic. Requires the subscription ARN. Only the subscription owner or topic owner can unsubscribe when authentication is required.

### Update SMS Settings

Update default SNS SMS account settings such as monthly spend limit, default sender ID, default SMS type, delivery status logging, and usage report bucket.

### Update Subscription

Update attributes of an existing SNS subscription. Configure filter policies, raw message delivery, delivery retry policies, dead-letter queue settings, or FIFO replay policy.

### Update Topic

Update attributes and/or tags of an SNS topic. Set any combination of display name, delivery policy, access policy, encryption, tracing, FIFO throughput/archive settings, and tags.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
