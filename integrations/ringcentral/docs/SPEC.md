Now let me get the full list of event filters and the SMS/messaging API details:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for RingCentral

## Overview

RingCentral is a cloud communications platform that provides voice calling, SMS/MMS, fax, team messaging, video meetings, webinars, and contact center capabilities. Its REST API allows programmatic access to these communication services, along with account configuration, call analytics, and AI-powered features like speech-to-text transcription and conversation insights.

## Authentication

RingCentral supports two OAuth 2.0 authentication methods. All apps require a Client ID and Client Secret, obtained by creating a REST API App in the RingCentral Developer Console.

**Base URL:** `https://platform.ringcentral.com`

### OAuth 2.0 Authorization Code Flow (with optional PKCE)

Best suited for applications acting on behalf of individual users where users are prompted for credentials interactively.

1. Redirect the user to the authorization URL:
   ```
   https://platform.ringcentral.com/restapi/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<STATE>
   ```
2. After user authorization, RingCentral redirects to your `redirect_uri` with a temporary authorization `code`.
3. Exchange the code for an access token by POSTing to `/restapi/oauth/token` with `grant_type=authorization_code`, the `code`, and `redirect_uri`. The request must include a Basic Auth header with base64-encoded `client_id:client_secret`.
4. The response includes an `access_token` and a `refresh_token`. Access tokens expire and should be refreshed using the refresh token via the same token endpoint with `grant_type=refresh_token`.

The redirect URI must exactly match one of the URIs registered in the app configuration. PKCE is recommended for enhanced security.

### JWT (JSON Web Token) Flow

Best suited for server-to-server integrations and scripts acting on behalf of a single service user or admin account. Not recommended for authenticating many individual users.

1. A user generates a JWT credential in the RingCentral Developer Console (under their profile > Credentials). JWT credentials cannot be created programmatically.
2. Exchange the JWT for an access token by POSTing to `/restapi/oauth/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` and `assertion=<JWT_TOKEN>`. Include a Basic Auth header with base64-encoded `client_id:client_secret`.
3. The response includes an `access_token` used for subsequent API calls.

JWTs can optionally be restricted to specific apps by client ID. A JWT inherits the permissions of the user who created it.

### Access Token Usage

Access tokens are passed via the `Authorization: Bearer <access_token>` HTTP header on all API requests.

### Scopes

Permissions are configured at the app level in the Developer Console. Common scopes include: ReadAccounts, EditExtensions, ReadCallLog, ReadMessages, SMS, InternalMessages, Fax, RingOut, TeamMessaging, Meetings, Video, WebhookSubscriptions, CallControl, and AI.

## Features

### Voice Calling and Call Management

Place outbound calls via RingOut (connects two phones through RingCentral) or WebRTC. Manage active calls with controls including hold, transfer, warm transfer, park, flip, forward, and conference. Configure call routing rules, answering rules, call forwarding, and call queues at the user, site, and company level.

### SMS and MMS Messaging

Send and receive SMS and MMS messages from RingCentral phone numbers. Supports both standard person-to-person (P2P) messaging and high-volume application-to-person (A2P) SMS for bulk messaging. A2P SMS supports batch sending, opt-in/opt-out management, and dedicated toll-free or local numbers. Message templates are available for reusable content.

### Fax

Send and receive faxes programmatically. Supports multipart document formats and fax forwarding/resending.

### Team Messaging

Post messages, adaptive cards, notes, tasks, and files into team chats and conversations. Create and manage teams and chat groups. Supports incoming webhooks for posting messages from external systems, and bot/add-in development for interactive integrations within the RingCentral app.

### Video Meetings

Create and manage video meeting bridges, schedule meetings, configure personal meeting rooms, manage meeting delegates (scheduling on behalf of others), and access meeting history and recordings. Retrieve PSTN dial-in numbers for meetings.

### Webinars

Create and manage webinars and sessions, invite hosts and co-hosts, manage attendee registration, and analyze past webinar data.

### Call Logs and Analytics

Access comprehensive call history including call metadata, duration, direction, participants, and call recordings. Supports account-level and extension-level call logs. The Analytics API provides aggregate and timeline-based reporting on communication usage across the organization.

### Account and User Configuration

Manage accounts, extensions, users, devices, phone numbers, and address books. Onboard and offboard employees, assign devices, configure presence and Do Not Disturb status, manage emergency locations, and set user feature flags and custom fields.

### Artificial Intelligence

Transcribe audio to text (speech-to-text), generate conversation summaries, perform speaker diarization, extract interaction analytics, and apply smart punctuation. Supports asynchronous processing with webhook callbacks for long-running tasks. RingSense provides AI-driven insights on calls.

### Social Messaging

Connect with customers across social channels including Facebook, Facebook Messenger, X (Twitter), Instagram, WhatsApp, LinkedIn, and Viber through a unified API.

### Message Store and Data Export

Access stored messages (SMS, fax, voicemail) and their metadata. Export message store data for compliance archival. Supports message synchronization and bulk export.

## Events

RingCentral supports event subscriptions via **webhooks** and **WebSockets**. Subscriptions are created through the Subscription API by specifying event filters (determining which events to receive) and a delivery mode (webhook URL or WebSocket connection). Webhook subscriptions require a publicly accessible HTTPS endpoint that supports TLS 1.2+ and must validate a `Validation-Token` header upon creation. Subscriptions can be configured with an expiration time and renewed as needed.

### SMS Events

Notifications for inbound SMS messages (instant message events) and high-volume A2P SMS batch status changes, individual batch message delivery events, and opt-out events.

### Fax and Voicemail Events

Notifications for inbound faxes, voicemail messages, and general message store changes (covering all message types).

### Telephony Session Events

Real-time notifications for call session state changes (setup, ringing, connected, held, disconnected, etc.). Available at both the account level (all extensions) and individual extension level. Includes detailed party information such as direction, caller/callee data, and call status.

### Presence Events

Notifications when user presence or availability changes, including detailed telephony state, DND status changes, and monitored line presence. Available at the account level or per-extension. Call queue member presence events are also supported.

### Account Events

Notifications for changes to the company directory, extension list (additions, removals, updates), individual extension info changes, extension grant list changes, extension favorites changes, and emergency address modifications. Contact center phone number change events are also available.

### Team Messaging Events

Notifications for new posts or post updates in team messaging, and changes to chat groups (creation, updates, membership changes).

### Webinar Events

Notifications for webinar session creation and modification, session state changes (start, end), registration setting changes, and registrant updates. These use a separate subscription endpoint (`/webinar/notifications/v1/subscriptions`).

### RingSense AI Events

Notifications when RingSense AI insights are generated for calls, providing summaries, next steps, and other extracted conversation intelligence.
