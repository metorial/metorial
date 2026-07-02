# Slates Specification for Push by Techulus

## Overview

Push by Techulus is a notification service that allows users to send custom push notifications to their iOS and Android devices via a REST API. It supports sending notifications to individual accounts, teams, and device groups, and integrates with no-code platforms like Zapier and Make.

## Authentication

Push by Techulus uses API keys for authentication.

- **API Key**: Your API Key is required for making any requests using the API. You can find it inside the console integrations page or the Account tab in the mobile app.
- **Team API Key**: Team API keys can be found in the team details screen.
- **Header**: The authentication header (API Key) to be specified in the request is `x-api-key`.
- **Alternative**: The API key can also be passed directly in the URL path (e.g., `/api/v1/notify/{apiKey}`) instead of using the header.

The behavior differs depending on which key is used: If you use your account API key, the notification will be sent to all devices in your account. If you specify a team API key, the notification will be sent to all devices for every member in the team.

## Features

### Send Notifications

Send push notifications to all devices connected to your account or to a specific team. Notifications support the following options:

- **Title and Body**: The notification title and message content.
- **Sound**: Valid sound options are default, arcade, correct, fail, harp, reveal, bubble, doorbell, flute, money, scifi, clear, elevator, guitar, pop.
- **Channel**: Notification channel, alphanumerical string and hyphens only.
- **Link**: A URL to attach to the notification.
- **Image**: An image URL to include with the notification.
- **Time Sensitive**: Time sensitive notifications will be delivered immediately, even if the device is in do not disturb mode (iOS only).

### Send Notifications to Device Groups

Send push notifications to a group of devices in your account. This only works with the account API key. A group ID is required to target specific device groups. The same notification options (title, body, sound, channel, link, image, time sensitive) are available.

### Async Notifications

Notifications can be sent asynchronously, which returns immediately without waiting for delivery confirmation. This supports the same parameters as synchronous notifications.

### Team Management (Beta)

Manage team membership through the API:

- **Invite User**: Add a user to a team. Once the user has accepted the invite, all future notifications will be received by the user. Requires the account API key, a team API key, and the invitee's email.
- **Remove User/Revoke Invite**: Remove a user from a team or revoke a pending invite. Requires the same parameters as inviting.

## Events

The provider does not support events. Push by Techulus is a notification delivery service — it sends notifications outbound but does not offer webhooks or event subscription mechanisms.
