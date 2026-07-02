# Slates Specification for Sendbird

## Overview

Sendbird is a communications platform that provides APIs and SDKs for embedding real-time chat messaging, voice/video calls, and business messaging (notifications) into applications. It allows you to directly work with data resources related to your Sendbird application's chat activities. It also provides a Calls Platform API for interacting with data associated with call activities, and a Desk API for customer support workflows.

## Authentication

Sendbird uses **API token authentication** for its Platform APIs. All API requests must include an API token in the HTTP request header.

### Application-Level API Token (Chat, Calls, Desk APIs)

API requests are authenticated using API tokens from your Sendbird application. You can use the master API token found in your dashboard under Settings > Application > General > API tokens, which is generated when an application is created. The master API token can't be revoked or changed. Using the master API token, you can generate a secondary API token, revoke a secondary API token, or list secondary API tokens.

- **Header name:** `Api-Token`
- **Header value:** Your master or secondary API token
- **Base URL (Chat):** `https://api-{application_id}.sendbird.com/v3/`
- **Base URL (Calls):** `https://api-{application_id}.calls.sendbird.com/v1/`
- **Base URL (Desk):** `https://desk-api-{application_id}.sendbird.com/platform/v1/`

The Application ID is case-sensitive.

The Desk API uses a separate header: `SENDBIRDDESKAPITOKEN`: an API key of your Sendbird Desk is required for Sendbird server to authenticate your API requests.

### Organization-Level API Key (Organization API)

With the Platform API, you can view, create, and manage Sendbird applications, application features, and organization members. Each HTTP request should be authenticated with the organization API key in the request header. The unique API key can be found on the organization owner's dashboard account under Organization settings > API Key. The organization API key can retrieve token information from all client apps.

- **Header name:** `SENDBIRDORGANIZATIONAPITOKEN`
- **Header value:** Your organization API key
- **Base URL:** `https://gate.sendbird.com/api/v2/`

### Required Inputs

- **Application ID**: Unique identifier for your Sendbird application (required for Chat, Calls, and Desk APIs).
- **API Token**: Master or secondary API token for application-level operations.
- **Organization API Key**: Required only for organization-level operations (managing applications, features, members).

## Features

### User Management

Create, update, delete, and list users within your Sendbird application. Users can be issued access tokens or session tokens for client-side authentication. Session tokens are a more secure option because they expire after a certain period whereas access tokens don't. Users can also have metadata and profile information attached.

### Channel Management

Manage two types of channels:

- **Group Channels**: Private or public channels for a defined set of members. Support features like distinct channels, super group channels, and ephemeral channels. Properties include name, cover image, custom type, and access code.
- **Open Channels**: Public channels that any user can enter and participate in, suitable for large-scale broadcasts or live event chats.

Channels can be created, updated, deleted, frozen/unfrozen, and listed. Members can be invited, join, leave, or be removed.

### Messaging

You can send a text message, a file message, or an admin message to a specific channel. You can build messaging functionalities ranging from the essential to the advanced, including features such as message threading, delivery receipts, and emoji reactions. Messages can be updated, deleted, searched, and listed. File attachments of any type are supported.

### Moderation

Sendbird's user moderation features allow you to block, mute, or ban users, or freeze channels, giving you control over who can participate in your community and what they can do.

- **Blocking**: Users can block other users to stop receiving their messages.
- **Muting**: Operators can silence specific users in a channel.
- **Banning**: Users can be expelled from channels for a specified duration or indefinitely.
- **Freezing**: Channels can be paused so only operators can send messages.
- Message moderation tools let you filter the content of messages and block domains, profanity, and images. These tools help to prevent inappropriate content from being shared.
- **Reporting**: Users, messages, and channels can be reported for review.

### Announcements

Send broadcast messages to multiple channels or users at once. Announcements can target specific user segments and can create new channels if needed.

### Voice and Video Calls

Using Calls Platform API, you can directly interact with the different types of resources which represent data associated with call activities in your Sendbird application. Supports direct (1-to-1) calls with dial, accept, and end actions, as well as group calls.

### Customer Support (Desk)

Using Desk Platform API, you can directly interact with the different types of resources which represent data associated with customer support activities in your Sendbird Desk. Manage support tickets, agents, customers, bots, groups, and proactive chats. Includes agent assignment, ticket transfer, and connection monitoring.

### Organization Management

With the Platform API, you can view, create, and manage Sendbird applications, application features, and organization members. This includes creating and deleting applications, copying application settings, managing organization member roles, and viewing audit logs.

### Push Notifications Configuration

Configure push notification settings for your application, including FCM and APNs token management, notification preferences per user and per channel, and push notification templates.

### Data Export and Privacy (GDPR)

Register and manage GDPR data export requests for user messages, channels, and user data to comply with data protection regulations.

## Events

Sendbird supports webhooks across its Chat, Calls, Desk, and Business Messaging products. With webhooks turned on in your Sendbird application, your server receives HTTP POST requests from the Sendbird server in the form of a response containing information on all events that occur within the application. Webhooks are configured through the Sendbird Dashboard, where you provide an endpoint URL and select which events to subscribe to.

Webhook payloads include an `x-sendbird-signature` header for verification. This is generated through SHA-256 encryption based on the POST request body and your API token. To verify the request, create a comparison value the same way and check if it matches.

### Chat Webhook Event Categories

Based on the full list of available webhook categories:

- **Open Channel Events**: Channel creation, removal, user enter/exit, message send/update/delete, and reporting.
- **Group Channel Events**: Channel creation, property changes, removal, member invite/decline/join/leave, message send/read/update/delete, freeze/unfreeze, reaction add/delete, and reporting.
- **User Events**: User blocking and unblocking of other users, push notification preference changes, and device token registration/unregistration.
- **Operator Events**: Registration and unregistration of operators by another operator's client app.
- **Report Events**: Messages reported by users, users reported by other users, and open/group channels reported by users.
- **Alert Events**: Profanity filter and image moderation alerts triggered when messages violate content policies.
- **Announcement Events**: Channel creation for announcements and announcement messages sent to target channels and users.

### Calls Webhook Event Categories

There are three webhook events for direct call:

- **direct_call:dial** – When a call is initiated.
- **direct_call:accept** – When a call is accepted.
- **direct_call:end** – When a call ends.

### Desk Webhook Event Categories

Desk webhooks notify on customer support activities, including:

- **Ticket Events**: Ticket creation, status changes, and closure.
- **Transfer Events**: Ticket transfers between agents.

### Business Messaging Webhook Event Categories

Webhooks can notify teams when a certain event takes place in regard to templates and notifications. This occurs whenever a real-time or batch notification is triggered.
