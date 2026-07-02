# Slates Specification for Zoom

## Overview

Zoom is a cloud-based video communications platform that provides video meetings, webinars, phone, chat, and collaboration tools. The Zoom API is a RESTful web service that allows developers to manage meetings, users, reports, webinars, recordings, and more from Zoom accounts. The API manages the pre-meeting experience such as creating, editing and deleting resources like users, meetings and webinars, and provides access to post-meeting information for reporting and analytics. It does not provide access to the in-meeting experience such as current attendee list or ability to mute participants.

## Authentication

Zoom uses **OAuth 2.0** exclusively for API authentication (JWT was deprecated in June 2023). There are two OAuth flows:

### User-Level OAuth (Authorization Code Grant)

Used for apps that act on behalf of individual Zoom users.

- **Authorization URL:** `https://zoom.us/oauth/authorize`
- **Token URL:** `https://zoom.us/oauth/token`
- **Credentials required:** Client ID and Client Secret (obtained from the Zoom App Marketplace when creating an app)
- Set an OAuth Redirect URL and add it to the OAuth Allow List in the app configuration.
- Scopes define the API methods the app is allowed to call, and thus which information and capabilities are available on Zoom. Scopes follow a `resource:action` pattern (e.g., `user:read`, `meeting:write`, `webinar:read`). Each API endpoint documents its required scope.
- Access tokens expire after 1 hour. Refresh tokens can last for 15 years. When refreshing, Zoom issues a new refresh token along with a new access token, making the previous refresh token invalid.

### Server-to-Server OAuth (Client Credentials)

Used to authenticate with Zoom using server-to-server OAuth account credentials to make API requests without user interaction.

- **Token URL:** `https://zoom.us/oauth/token?grant_type=account_credentials&account_id={accountId}`
- Credentials required: Account ID, Client ID, and Client Secret, which are used to generate an access token.
- Client authentication is sent as a Basic Auth header (Base64-encoded Client ID and Client Secret).
- Scopes are configured at app creation time in the Zoom App Marketplace and cannot be overridden at token request time.
- This flow operates at the account level, not per-user.

## Features

### Meeting Management

Create, join, and manage meetings. Configure meeting settings including scheduling, recurrence, passwords, waiting rooms, breakout rooms, host/participant video defaults, join-before-host, and alternative hosts. Manage meeting registrants and polls.

### Webinar Management

Access the Zoom Webinar API to manage webinars. Requires a paid webinar add-on. Create and configure webinars, manage registrants, panelists, polls, and Q&A settings.

### Cloud Recording Management

Access and manage cloud recordings of meetings and webinars. Transcripts can be accessed through the recording features and are available for Pro, Business, or Enterprise accounts. Download, list, and delete recordings.

### User Management

Manage Contact Groups, Groups, and Users. Create, update, delete, and list users. Manage user settings, permissions, and roles within an account.

### Zoom Phone

Access and control Zoom Phone via the RESTful Zoom Phone API. Manage call logs, call recordings, voicemail, phone numbers, call queues, auto-receptionists, and SMS sessions. Requires Zoom Phone license.

### Chat

Access data connected to chat and chat channels. Send and receive chat messages. Manage channels, channel members, and message history.

### Zoom Rooms

Zoom Rooms provide a conference room experience with audio, video, screen sharing, whiteboarding, and digital signage. Manage Zoom Rooms using the API—create new Rooms or change configurations.

### Reports and Dashboards

Access user details, meeting reports, and dashboard data. Retrieve usage reports, meeting participant reports, and operational metrics. Some reports require Business or higher plans.

### Contact Center

Access data from the Zoom Contact Center. Requires Zoom Contact Center subscription.

### Account and Settings Management

Manage account-level settings including security, meeting defaults, recording behavior, and integration preferences. Manage sub-accounts for master account holders.

## Events

Zoom supports webhooks for real-time event notifications. Zoom utilizes webhooks to notify third-party applications about events that occur in a Zoom account. Event notifications are sent as HTTP POST requests in JSON to the endpoint you specify in your Marketplace app.

Webhooks require configuring Event Subscriptions in your Zoom Marketplace app, specifying an HTTPS endpoint URL. Zoom uses a challenge-response check (CRC) for webhook validation. Incoming requests are verified via an `x-zm-signature` header using HMAC-SHA256. Events follow a `$object.$action` naming convention (e.g., `meeting.started`, `user.created`).

Event types are grouped into the following categories:

### Meeting Events

Meeting lifecycle events: created, updated, deleted, started, ended. Participant events: joined, left. Meeting-specific events such as sharing started/ended and meeting recovery.

### Webinar Events

Webinar lifecycle events: created, updated, deleted, started, ended. Registration events, attendee joined/left, and Q&A/polling events.

### Recording Events

Cloud recording lifecycle: completed, paused, resumed, started, stopped, trashed, deleted, recovered. Transcript completed.

### User Events

User events include actions such as: activated, created, deactivated, deleted, disassociated, updated. Role assignment changes and user settings updates.

### Zoom Phone Events

Call events for Zoom Phone: call started, ended, ringing, answered, missed, voicemail received, and call recording completed.

### Chat Message Events

Chat message sent, updated, deleted, reactions, and file-sharing events within chat channels.

### Chat Channel Events

Channel created, updated, deleted, and membership changes (member joined, left).

### Zoom Rooms Events

Room alerts, check-in/check-out events, and room status changes.

### Account Events

Account-level events such as account settings updates and sub-account changes.

### User Activity Events

Sign-in and sign-out activities, presence status changes.

### Billing Events

Subscription and plan change notifications.
