Let me get more details on specific API features like Glances, Groups, and the new Webhooks feature.Now let me also check the Receipts/Callback API for completeness on events:# Slates Specification for Pushover

## Overview

Pushover is a notification service that delivers real-time push notifications to Android, iOS, and desktop devices. It provides a REST API for sending messages, managing delivery groups, and pushing data to smartwatch widgets. It also supports inbound webhooks to convert external JSON payloads into Pushover notifications.

## Authentication

Pushover uses a simple API key-based authentication model with two required credentials:

1. **Application API Token** (`token`): A 30-character alphanumeric string obtained by registering an application on the [Pushover website](https://pushover.net/apps/build). This token identifies the sending application and is included in every API call. Registration is free.

2. **User Key** (`user`): A 30-character alphanumeric string assigned to each Pushover user account, found on the user's [dashboard](https://pushover.net/dashboard). This identifies the recipient of notifications. A Group Key (same format) can be used instead to target multiple users.

Both credentials are passed as POST parameters (not as HTTP headers) with each API request. There is no OAuth, no session tokens, and no per-call signing. All API calls must be made over HTTPS.

## Features

### Push Notifications

Send push notifications to users or groups across all their devices (or specific named devices). Messages support a body (up to 1024 characters), optional title (up to 250 characters), HTML formatting or monospace styling, supplementary URLs with custom titles, custom timestamps, notification sounds (built-in or custom-uploaded), image attachments (up to 5 MB via multipart or Base64), and a Time to Live (TTL) for auto-deletion.

### Message Priority Levels

Messages can be sent with five priority levels: lowest (-2, silent), low (-1, no sound/vibration), normal (0), high (1, bypasses quiet hours), and emergency (2, repeats until acknowledged). Emergency-priority messages require `retry` (interval in seconds, minimum 30) and `expire` (max 10800 seconds) parameters, and return a receipt for tracking acknowledgement status.

### Emergency Message Receipts and Callbacks

Emergency-priority messages return a receipt ID that can be polled to check acknowledgement status (who acknowledged, when, from which device). A `callback` URL can be provided to receive an HTTP POST when the notification is acknowledged, removing the need to poll. Emergency retries can be canceled by receipt ID or by arbitrary tags assigned when the message was sent.

### Delivery Groups

Create and manage groups of users that can be addressed with a single group key. Users can be added, removed, temporarily disabled, or re-enabled within a group. Each group member can optionally be restricted to a specific device. Groups can be listed, inspected, and renamed via the API.

### Subscriptions

Allow end users to self-subscribe or unsubscribe from an application's notifications via a Pushover-hosted page (web-based or group-based). Web-based subscriptions redirect users back to your site with their subscription key. Existing user keys can be migrated to subscription keys via the API.

### Glances (Widget Data)

Push small data updates (title, text, subtext, count, percent) to smartwatch complications and device widgets via a separate API. This does not generate notifications or sounds — it silently updates on-screen widgets. Currently only Apple Watch is supported as a widget target.

- Updates should be infrequent (recommended minimum 20 minutes apart; watchOS limits 50 updates/day).

### User/Group Validation

Validate that a user key or group key is valid, the account is active, and has at least one active device. Returns a list of the user's active devices and licensed platforms.

### Inbound Webhooks

Users can create webhook receiver URLs via the Pushover dashboard. External systems can POST JSON payloads to these URLs, and Pushover extracts data from the payload using configurable selectors (mapped to notification title, body, URL, image, etc.) to generate notifications. This is useful for integrating systems that support outbound webhooks but not Pushover natively.

### Licensing

A Teams API and Licensing API are available for managing Pushover for Teams accounts, including assigning and managing per-user licenses programmatically.

## Events

Pushover supports a single callback mechanism:

### Emergency Message Acknowledgement Callback

When sending an emergency-priority notification, a `callback` URL can be included. Pushover's servers will POST to this URL when a user acknowledges the notification, providing the receipt ID, acknowledgement timestamp, the acknowledging user's key, and their device name. If the callback fails, Pushover retries after one minute.

- **Parameters**: `callback` (a publicly-accessible HTTP or HTTPS URL), set at message send time.
- This is only available for emergency-priority (priority=2) messages.

Note: Pushover's inbound webhooks (described in Features) are for _receiving_ external data into Pushover, not for subscribing to Pushover events. There is no general-purpose event subscription or webhook system for listening to arbitrary Pushover events.
