Now let me get the full list of webhook events and the OAuth token endpoint details:Now I have enough information to write the specification. Let me also check for the full webhook events list including user/number/contact events:Now I have comprehensive information to write the specification.

# Slates Specification for Aircall

## Overview

Aircall is a cloud-based phone system for businesses that provides voice calling, SMS messaging, and related communication tools. Aircall is a cloud-based phone system that provides businesses with a suite of communication tools. Its API allows managing calls, users, contacts, phone numbers, teams, tags, and messaging, as well as receiving real-time event notifications via webhooks.

## Authentication

Aircall supports two authentication methods:

### 1. Basic Authentication

If you are an Aircall customer, building for your own Aircall account only, the Basic Auth flow will do the trick.

- The username and password credentials are called `api_id` and `api_token` in the Aircall Dashboard. You can create some in your Company's Settings page.
- The `api_id` and `api_token` are concatenated with a single colon `:`. The resulting string is encoded using Base64. The authorization header results in `Authorization: Basic YOUR_ENCODED_STRING`.
- The `api_token` (the password) will be presented to you only on API Key creation.
- Base URL: `https://api.aircall.io/v1`

### 2. OAuth 2.0 (Authorization Code Flow)

If you want to build an App for companies using Aircall — this is mainly the case for Technology Partners — please use the OAuth flow. It is a requirement to be listed on the Aircall App Marketplace.

- The `client_id` and `client_secret` are provided by Aircall.
- **Authorization URL:** `https://dashboard.aircall.io/oauth/authorize`
  - Query parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope=public_api`, and an optional `state` parameter for CSRF protection.
- The `scope` must be `public_api`.
- An authentication code is provided by Aircall valid for 10 minutes. It must be converted into an `access_token`.
- **Token Exchange URL:** `https://api.aircall.io/v1/oauth/token` — exchange the authorization code for a permanent `access_token` using `client_id`, `client_secret`, and `code`.
- The resulting token is used to send requests to Aircall Public API as a Company.
- All endpoints behave similarly between the two authentication methods, unless indicated otherwise in the documentation.

## Features

### Call Management

Retrieve, monitor, and manage inbound and outbound calls. Pull recordings, notes, participants, tags and sync them with your CRM, Helpdesk or data warehouse. You can transfer calls to specific users, teams, or external phone numbers with configurable dispatching strategies (simultaneous, random, longest idle). Automatically tag, comment or start/pause call recordings through the Public API. Calls include metadata such as direction, duration, status, missed call reasons, and IVR options selected.

### User Management

List, retrieve, create, update, and delete users, as well as check user availability and start outbound calls or dial phone numbers on behalf of users. You can set wrap-up time, manage availability status, and retrieve granular availability statuses for all users. Users can be assigned admin or agent roles.

### Contact Management

Create, retrieve, update, and delete contacts in Aircall. A 2-way contact sync system can be easily built with the Aircall Public API and Webhook contact events. Contacts include phone numbers, emails, and company information.

### Phone Number Management

List and retrieve phone numbers associated with the Aircall account. Numbers include details such as country, timezone, and open/closed status. You can update number settings such as welcome messages.

### Team Management

List, retrieve, create, and delete teams, as well as add or remove users from teams. Teams are only used in call distributions of Numbers.

### Tags

Retrieve and manage tags used to categorize and label calls. Tags can be applied to or removed from calls via the API.

### Messaging (SMS/MMS)

The Send Message endpoint allows you to send SMS or MMS messages from your Aircall phone numbers. This is useful when integrating external tools or custom applications that need to send messages as if they originated from Aircall. Numbers must be configured for API-based messaging before use. Sending SMS via API is available only in the United States, Canada, Germany, France and Australia. Sending messages through the API is available only on the Aircall Professional plan. Messages sent through the API are not recorded or displayed anywhere in the Aircall platform.

### Insight Cards

Display and link to customer information from disparate systems, right inside the phone. Insight Cards allow you to push custom contextual data into the agent's call view during ongoing calls. Insight cards will only be seen during ongoing calls and are not stored after calls are complete.

### Webhook Management

Create, list, retrieve, update, and delete webhooks programmatically via the API. You can specify a custom name, target URL, and a list of specific events to subscribe to. Aircall allows you to create 100 different Webhooks per account.

### Power Dialer

Aircall offers a Power Dialer feature, available via the Public API. This allows automating outbound dialing sequences for sales teams.

## Events

Aircall supports webhooks that send real-time POST requests to a specified HTTPS URL when events occur. Aircall will send POST requests to a public URL hosted on your web servers, each time an event happens. Webhooks can be created via the Aircall Dashboard or programmatically via the API. Each webhook includes a unique token in every event payload for verification. You can subscribe to specific event types or receive all events by default.

### Call Events

Events tracking the full lifecycle of a call. Includes:

- `call.created` — a new call is initiated (inbound or outbound)
- `call.ringing_on_agent` — the call is ringing on an agent's phone
- `call.agent_declined` — an agent declined the call
- `call.answered` — the call was answered
- `call.transferred` — the call was transferred to another user, team, or external number
- `call.unsuccessful_transfer` — a transfer attempt failed
- `call.hungup` — triggered immediately when the call ends (data may be incomplete)
- `call.ended` — triggered once all call data (recordings, duration, etc.) is gathered, typically ~30 seconds after hangup
- `call.voicemail_left` — a voicemail was left
- `call.assigned` — the call was assigned to a user
- `call.archived` — the call was archived
- `call.tagged` — a tag was added to the call
- `call.untagged` — a tag was removed from the call
- `call.commented` — a comment was added to the call

### User Events

Events related to user activity and management. Includes:

- `user.created` — a new user was created
- `user.deleted` — a user was deleted
- `user.opened` / `user.closed` — a user went online or offline in Aircall

### Contact Events

Events related to contact changes. Includes:

- `contact.created` — a new contact was created
- `contact.updated` — a contact was updated
- `contact.deleted` — a contact was deleted

### Number Events

Events related to phone number changes. Includes events for when numbers are created, opened, or closed.

### Message Events

The feature encompasses three primary messaging events: `message.sent` (when a message is successfully sent), `message.received` (when a message is received), and `message.status_updated` (provides updates on the status of a message, such as read receipts or delivery confirmations).

- Only webhooks are available for messaging events; it is not possible to do batch syncing using API endpoints. This means you will not be able to fetch historical messages before you started listening to webhooks.

### Integration Events

Events related to integration lifecycle changes (e.g., when an integration is installed or deleted from an Aircall account).
