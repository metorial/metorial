# Slates Specification for Twilio

## Overview

Twilio is a cloud communications platform that provides APIs for sending and receiving messages (SMS, MMS, WhatsApp), making and managing phone calls, verifying user identities, and looking up phone number information. It offers messaging APIs for SMS, RCS, WhatsApp, and MMS, as well as voice APIs to make, receive, monitor, and capture data from calls at global scale. It also provides services for multi-channel conversations, phone number management, user verification, and event streaming.

## Authentication

Twilio uses **HTTP Basic Authentication** for all API requests.

There are two credential options:

1. **Account SID + Auth Token**: Twilio uses the Account SID and Auth Token to authenticate API requests. For local testing, you can use your Account SID as the username and your Auth token as the password. You can find your Account SID and Auth Token in the Twilio Console. The Account SID follows the format `AC` followed by 32 hexadecimal characters (e.g., `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).

2. **API Keys (recommended for production)**: API keys are the preferred way to authenticate with Twilio's REST APIs. With API keys, you control which users and applications have access to your Twilio Account's API resources, and you can revoke access at your discretion. Use your API key as the username and your API key secret as the password. You can create an API key either in the Twilio Console or using the API.

   There are two types of API keys:
   - **Standard API Keys** give you access to all the functionality in Twilio's API, except managing API Keys, Account Configuration, and Subaccounts.
   - **Main API Keys** have the same access as standard keys, but can also manage API Keys, Account Configuration, and Subaccounts.

3. **Access Tokens (for client-side SDKs)**: Access Tokens are short-lived tokens that you use to authenticate Twilio client-side SDKs like Voice, Conversations, Sync, and Video. You create them on your server to verify a user's identity and grant access to client API features. All tokens have a limited lifetime, configurable for up to 24 hours. Access Tokens are JWTs signed with an API key secret and include grants that define which resources the token holder can access.

The Twilio REST API is served over HTTPS. To ensure data privacy, unencrypted HTTP is not supported.

Base URL: `https://api.twilio.com/2010-04-01` (for core Voice/Messaging resources). Other products use different base URLs (e.g., `https://conversations.twilio.com/v1`, `https://verify.twilio.com/v2`, `https://messaging.twilio.com/v1`).

Twilio API credentials are a Region-specific resource. If your Account uses Twilio Regions, refer to Manage Regional API Credentials.

## Features

### Programmable Messaging

Send and receive SMS, MMS, and WhatsApp messages, track delivery status, and manage message media and history.

- Supports SMS, MMS, WhatsApp, and RCS channels.
- Schedule SMS, MMS, or WhatsApp messages to be sent at a future date and time with a single API call.
- Messaging Services allow grouping senders and managing compliance settings at scale.
- Messages can include media attachments.

### Programmable Voice

Twilio's Voice API helps you to make, receive, and monitor calls around the world. Using this REST API, you can make outbound phone calls, modify calls in progress, and query metadata about calls you've created. More advanced call features like programmatic call control, creating conference calls and call queues, call recordings, and conversational IVRs are available.

- You can also use the API to route voice calls with global reach to phones, browsers, SIP domains, and mobile applications.
- Call flow is controlled via TwiML (Twilio Markup Language), an XML-based instruction set.

### Conversations

The Conversations API allows you to create conversational (back-and-forth) messaging across multiple channels: Chat, WhatsApp, and SMS.

- Add or remove participants and assign roles via the API.
- Maintain conversation history for ongoing context with every interaction.
- Define conversations as active, inactive, or closed—and set conversation expiration time.
- Supports media sharing across channels.

### Verify

Twilio Verify API is a fully managed authentication service that lets you add multichannel verification methods (like one-time passcodes, Passkeys, or Silent Network Authentication) to your app or website without building your own infrastructure.

- OTP delivery via SMS, WhatsApp, voice, and email, all managed through a single API.
- Supports TOTP (time-based one-time passwords) and push authentication.
- Built-in fraud prevention with Fraud Guard.

### Lookup

Twilio Lookup provides real-time phone number intelligence to help businesses verify users and prevent fraud by ensuring accurate information about phone number type, carrier, country, if the phone number is active or reachable, phone number ownership, and more.

- The Basic Lookup request is a free feature that returns the provided phone number in E.164 and national formats and performs basic phone number validation.
- Additional paid data packages include line type intelligence, caller name, SIM swap detection, identity match, and reassigned number detection.

### Phone Number Management

Manage toll-free, A2P 10DLC, short codes, and Alphanumeric Sender IDs to deliver your communications.

- Search for and purchase phone numbers.
- Configure voice and messaging URLs for owned numbers.

### Studio

The Studio REST API lets you trigger flows programmatically and also retrieve information about your flows and executions.

- Studio is a visual, drag-and-drop builder for communication workflows.
- Flows can be triggered via the API or by incoming calls/messages.

### Account Management

- Manage subaccounts for organizational separation.
- Create and manage API keys.
- View usage records and billing information.

## Events

Twilio supports two complementary event mechanisms: **product-specific webhooks** and the centralized **Event Streams** API.

### Product-Specific Webhooks

Twilio uses webhooks to let your application know when events happen, such as receiving an SMS message or getting an incoming phone call. When the event occurs, Twilio makes an HTTP POST or GET request to the URL you configured for the webhook. The Twilio request includes details of the event.

- **Incoming Message Webhooks**: Triggered when an SMS/MMS/WhatsApp message is received on a Twilio number. Requires a TwiML response to instruct Twilio how to handle the message.
- **Message Status Callbacks**: Notify your application of message delivery status changes (queued, sent, delivered, undelivered, failed, read). Configured per message or via Messaging Services.
- **Incoming Call Webhooks**: Triggered when a voice call is received on a Twilio number. Requires a TwiML response to control call flow.
- **Voice Status Callbacks**: Notify your application of call status changes (initiated, ringing, answered, completed). Configured per call or on the phone number.
- **Recording Status Callbacks**: Notify when a call recording is complete and ready for download.
- **Conversations Webhooks**: Your Conversations service can have global webhooks that apply to every conversation within the service, or you can specify webhooks per conversation. Post-action webhooks are available for all three types of webhooks (global, service-level and conversation-scoped). Includes pre-action webhooks (before an action is committed, allowing modification or rejection) and post-action webhooks (after an action is committed). Covers events like conversation creation, message added, participant joined, etc.

### Event Streams (Centralized Event Delivery)

Twilio logs actions within our platform as events. Use the Event Streams REST API to set up and manage subscriptions to specific events. You can stream events to multiple sinks (destinations).

- You can configure Event Streams to send events to Amazon Kinesis, Segment, or webhooks.
- Event Streams now supports 80+ event types across 10+ Twilio products.
- Event categories include Messaging (message sent, delivered, failed, received), Voice (call summary, call insights), TaskRouter (task created, assigned, completed), Studio (flow execution started/ended, step events), Conversations, Super SIM, and more.
- An Event Streams subscription specifies the event types and schema versions that you want to receive.
- Event Streams guarantees at-least-once delivery of events. Twilio sends each event to your system at least once, and we might send the same event more than once when retrying delivery after a failure.
- Event Streams is additive and doesn't replace webhooks. Twilio continues to support existing webhooks and add new webhooks for TwiML use cases.
- Event Streams isn't a replacement for webhooks that respond with TwiML. Twilio delivers events asynchronously and there is no bi-directional channel to send a response to an event.
