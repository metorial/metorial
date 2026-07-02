# Slates Specification for Ably

## Overview

Ably is a realtime messaging platform that provides pub/sub messaging, presence, and push notification services over WebSockets and other protocols. The REST API provides server and client devices with the ability to publish messages, issue access tokens, obtain message and presence history, and retrieve statistics, while the realtime interface adds persistent connections for subscribing to channels. Ably also offers a Control API, a REST API that enables programmatic management of your Ably account.

## Authentication

Ably has two separate APIs with different authentication mechanisms:

### Pub/Sub API (REST & Realtime)

Ably supports two main authentication schemes: basic authentication and token authentication.

**Basic Authentication (API Key):**

- Every Ably app can have one or more API keys associated with it. API keys authenticate directly with Ably or are used to issue tokens.
- An Ably API key string has the following format: `I2E_JQ.OqUdfg:EVKVTCBlzLBPYJiCZTsIW_pqylJ9WVRB5K9P19Ap1y0` (structured as `<app ID>.<key ID>:<key value>`).
- The API key is used in the HTTP Basic Authorization header when calling the REST API at `https://rest.ably.io`.
- Basic authentication may only be used over TLS (HTTPS) connections.
- Never use API keys in client-side code. API keys don't expire; once compromised, they grant indefinite access.

**Token Authentication:**

- Token authentication uses an Ably-compatible token to authenticate without sharing a private API key. This can be an Ably Token obtained via the REST API `requestToken` endpoint, an Ably JWT signed by your API key, or an External JWT with an embedded Ably-compatible token.
- Tokens are short-lived and may be issued with a particular scope, such as a limited set of access rights or capabilities, or being limited to use by a specific clientId identity.
- Token request endpoint: `POST https://rest.ably.io/keys/{keyName}/requestToken`

**Capability operations** available for API keys and tokens: channel-metadata, history, presence, publish, push-admin, push-subscribe, statistics, subscribe.

### Control API

- In order to use the Control API you must first create an access token in the Ably dashboard. You can then use the Control API to manage many account functions without having to interact with the dashboard.
- You use the access token to authenticate requests to the Control API. To do this, you supply the access token as a Bearer token in the Authorization header of the HTTP request.
- Base URL: `https://control.ably.net/v1`
- Access tokens are created from the "My Access Tokens" section in the Ably dashboard with specific capabilities such as `read:app`, `write:app`, `read:key`, `write:key`.

## Features

### Publish/Subscribe Messaging

Ably Pub/Sub enables you to implement the publish-subscribe pattern. Any number of publishers can send messages to a channel, and any number of subscribers can receive those messages. Messages can be published via the REST API or realtime connections. Messages can also be updated, deleted, or appended to after publishing.

### Presence

The presence feature enables clients to be aware of other clients that are currently "present" on a channel. Subscribers receive updates when a client joins, leaves, or updates an optional payload associated with each member. The payload can be used to describe their status.

- Presence is commonly used as an online indicator to create an avatar stack or to notify occupants of a chat room.

### Message History

Messages and presence events are persisted and can be retrieved historically. This enables clients to retrieve messages they may have missed while disconnected.

- Messages are stored in memory for 2 minutes, enabling SDKs to automatically retrieve them in the event of network connectivity issues.

### Channel Metadata and Status

You can query the status and occupancy of channels, enumerate active channels, and subscribe to metadata changes about channels (lifecycle and occupancy).

- The channel-metadata capability allows querying channel status. When associated with the wildcard resource `*`, it also allows enumerating all active channels.

### Statistics

Retrieve application-level usage statistics including message counts, connections, and API requests.

### Token Management

Issue and manage short-lived tokens for clients with fine-grained capabilities. Tokens can be scoped to specific channels, operations, and client identities. Tokens can also be revoked.

### Queues

Set up queue rules to republish messages, presence events, or channel events from pub/sub channels into a queue. Ably Queues provide a simple and robust way to consume realtime data from worker servers without having to worry about queueing infrastructure. Consumers connect via AMQP or STOMP protocols.

### Firehose (Outbound Streaming)

Ably's Firehose can stream realtime data published within the Ably platform directly to another streaming or queueing service, for example to Amazon Kinesis.

- Supported targets include Kafka, Amazon Kinesis, Amazon SQS, AMQP, and Apache Pulsar.
- Using configurable rules, you can stream messages, presence events, occupancy, and channel lifecycle events.

### Account and App Management (Control API)

Using the Control API you can automate the provisioning, management, and testing of your Ably realtime infrastructure. You can dynamically create Ably apps, configure them, and delete them if necessary.

- Repetitive operations such as creating, updating or deleting Ably apps, enumerating queues, creation of rules, and other tasks can be automated.
- Manage API keys, namespaces, integration rules, and queues programmatically.

### Inbound Webhooks

Incoming webhooks publish messages to an Ably channel. You can subscribe to these messages using an Ably SDK. This allows external services to push data into Ably channels via a generated endpoint URL.

## Events

Ably supports outbound webhooks that notify external systems when events occur within the platform. Webhooks allow you to configure integration rules that react to messages being published or presence events emitted on channels. These rules can notify HTTP endpoints, serverless functions, or other services for each event as they arise, or in batches.

### Event Sources

The following event sources can trigger webhook notifications:

**Channel Messages (`channel.message`):**

- If the source `channel.message` is selected, you receive notifications when messages are published on a channel.

**Channel Presence (`channel.presence`):**

- If the source `channel.presence` is selected, you receive notifications of presence events when clients enter, update their data, or leave channels.

**Channel Lifecycle (`channel.lifecycle`):**

- Get notified when a channel is created (following the first client attaching to this channel) or discarded (when there are no more clients attached to the channel).

**Channel Occupancy (`channel.occupancy`):**

- Receive events when channel occupancy changes (number of connections, subscribers, publishers, or presence members).

### Configuration Options

- You can configure integration rules from the Integrations tab in your dashboard on a per-app basis. Integration rules can filter by channel naming using a regular expression.
- Delivery can be configured as single requests (one event per HTTP call) or batched requests (multiple events per call).
- Payloads can be enveloped (wrapped with metadata) or sent as raw message data.
- Encoding can be JSON or MsgPack.
- Pre-built integrations are available for AWS Lambda, Azure Functions, Google Cloud Functions, Zapier, Cloudflare Workers, IFTTT, and generic HTTP endpoints.
