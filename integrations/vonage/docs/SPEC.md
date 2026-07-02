Now let me get the authentication details page properly:Now I have enough information to write the specification.

# Slates Specification for Vonage

## Overview

Vonage (now part of Ericsson) is a cloud communications platform (CPaaS) that provides APIs for messaging (SMS, MMS, RCS, WhatsApp, Facebook Messenger, Viber), voice calling, video conferencing, user verification/2FA, and phone number intelligence. Vonage API Platform offers communication APIs for voice, messaging, video, and authentication.

## Authentication

Vonage supports two primary authentication methods, depending on which API product is being used:

### 1. API Key and Secret (Basic Authentication)

Once you have an account, you can find your API Key and API Secret at the top of the Vonage API Dashboard. These credentials are used with APIs such as SMS, Number Insight, Number Management, and Subaccounts.

- **Query parameter auth**: Pass `api_key` and `api_secret` as query parameters or in the request body.
- **Basic HTTP auth**: Base64-encode the API key and secret in the `Authorization: Basic` header.

### 2. JSON Web Token (JWT) / Bearer Authentication

For APIs which use a JWT for authentication you'll need to pass application_id and private_key arguments. Newer endpoints that support JWT authentication include the Voice API and Messages API.

To use JWT authentication:

1. Create a Vonage Application in the Dashboard.
2. Click "Generate public and private key", which will download a file called "private.key" to your computer.
3. The JWT payload requires `application_id` (the ID of the application) and `acl` (a list of permissions the token will have).
4. Sign the JWT using the private key and include it via `Authorization: Bearer <token>`.
5. By default, Vonage JWT tokens are generated with a TTL of 15 minutes after generation.

**APIs using API Key/Secret**: SMS API, Number Insight, Number Management, Pricing, Account, Subaccounts, Verify (Legacy).

**APIs using JWT (Bearer)**: Voice API, Messages API, Verify v2, Video API, Network APIs, Application API.

### 3. Video API Authentication

REST API calls must be authenticated using a custom HTTP header — X-OPENTOK-AUTH — along with a JSON web token. The JWT claims include `iss` (your API key), `ist` ("project"), `iat`, `exp`, and `jti`.

## Features

### Messaging (Messages API & SMS API)

The Messages API has all-inclusive features to create customer experiences with SMS, MMS, RCS, social chat apps, and more. Send and receive messages across channels including Facebook Messenger and Viber. Supports text, images, audio, video, files, and interactive/template messages depending on the channel. Send transactional messages, notifications, and marketing campaigns through the customer journey.

- Configure sender IDs, short codes, and local numbers.
- Automatic message concatenation and Unicode translation for SMS.
- Channel-specific features like WhatsApp interactive messages and RCS branded messaging.

### Voice

Vonage Voice APIs allow you to connect people around the world and automate voice interactions using AI technologies. Make and receive calls over PSTN and IP, control call flow using JSON-based Call Control Objects (NCCOs).

- Automatic Speech Recognition powering Voice Enabled IVRs in over 120 languages.
- Text-to-speech in multiple languages and accents.
- Record up to 32 call participants in separate tracks.
- Conference calls, call transfers, DTMF input, answering machine detection, and WebSocket streaming for real-time audio.
- SIP trunking integration with existing VoIP infrastructure.

### Video

Integrate real-time video into web, desktop, mobile and IoT apps with the Video API or the low-code Meetings API. Features include screen-sharing, archiving, text chat, broadcasting, and more.

- One-to-one and multi-party video sessions.
- AI-powered processing including captions, transcriptions, background replacement, and noise suppression.
- Recording/archiving with configurable storage (S3, Azure).
- SIP interconnect for bridging video sessions with phone calls.
- Experience Composer for server-side rendering of video sessions.

### Verification (Verify API)

Authenticate user accounts and prevent fraud with mobile two-factor authentication using SMS, RCS, WhatsApp, voice, email, or silent authentication.

- Define multi-step workflows with automatic channel failover (e.g., try SMS first, then voice).
- Silent Authentication uses a cellular data connection to transmit authentication information without requiring an OTP.
- Only charges for successful verifications.

### Number Insight

Ensure clean data input, check if a number was recently ported, identify number types (premium, toll-free, mobile, landline, VoIP), and detect recent SIM swaps.

- Three tiers: Basic (format/country), Standard (carrier/type), and Advanced (reachability/roaming/SIM swap).
- Advanced insight supports asynchronous mode with webhook delivery.

### Number Management

Purchase, configure, and manage virtual phone numbers globally. Search for available numbers by country, type, and features. Link numbers to applications for inbound call/message handling.

### Network APIs

Network APIs expose advanced mobile network capabilities — like silent authentication, SIM swap checks, or 5G network slicing.

- Quality on Demand enables API-triggered adjustments to latency, throughput, and traffic priority.
- Number verification, device location, and SIM swap detection via carrier networks.

### Fraud Protection

Protect your business and customers with fraud alerting and blocking compatible with SMS and voice traffic. Fraud Defender allows you to set rules to catch fraudulent traffic from phone numbers.

### Account & Subaccount Management

The Subaccounts API allows businesses to scale their communications use cases and programmatically create new subaccounts. Manage credit, track usage, set usage limits, and suspend subaccounts. Transfer balances and numbers between accounts.

### Reporting & Audit

Flexible reporting for all Vonage communications channels in one API. Audit an array of account events to generate reports. Advanced Insights API integrates detailed video session data into your analytics.

### Application Management

Create and configure Vonage Applications, which act as containers for capabilities (Voice, Messages, RTC, Video). Each application has its own webhook URLs, keys, and capability settings.

## Events

Vonage supports webhooks extensively across its APIs. You configure callback URLs either at the application level or at the account/number level.

### Message Status Webhooks

Receive delivery receipts and status updates for outbound messages sent via the Messages API or SMS API. Statuses include submitted, delivered, rejected, and failed. The Messages API requires two webhooks: an inbound message webhook and a message status webhook.

### Inbound Message Webhooks

Receive notifications when messages are sent to your Vonage number across any supported messaging channel (SMS, WhatsApp, Messenger, Viber, RCS).

### Voice Event Webhooks

Receive call lifecycle events when using the Voice API. Two primary webhook types:

- **Answer URL**: Called when an inbound call is received or an outbound call is answered; expects an NCCO response to control call flow.
- **Event URL**: Receives call state change events (e.g., ringing, answered, completed, failed, busy), recording completion notifications, DTMF input, and speech recognition results.

### Video Session Monitoring Callbacks

OpenTok infrastructure can send HTTP requests for all connections made (and destroyed) to all sessions for a single project. When clients publish or unpublish streams, streamCreated and streamDestroyed events are sent to your callback endpoint.

- Configure via the Video API Dashboard per project.
- Additional callback categories: Session Monitoring (session activity), Archiving Monitoring (recording status), SIP Call Monitoring (SIP call activity), and Experience Composer Monitoring.

### Verify Event Webhooks

Receive status updates for verification requests, including when a verification succeeds, fails, or expires.

### Number Insight Advanced Async Callback

When using the asynchronous mode of the Advanced Number Insight API, full results are delivered to a specified webhook URL upon completion.
