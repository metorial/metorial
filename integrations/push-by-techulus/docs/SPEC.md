# Push by Techulus integration reference

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

### Delivery Results and Async Notifications

Both notification tools expose the provider's optional `responses` array, retaining each device result's `success`, `message`, and additional provider fields. A successful overall request can include unsuccessful device results, so inspect this array when available.

The `send_notification` tool accepts `async: true` for an acknowledgement without per-device delivery results. This supports the same notification options. The provider recommends async delivery for teams or more than ten devices. Requests have a 30-second timeout and are not retried automatically; a timeout does not prove that no notification was delivered.

The documented API does not expose device-group discovery. Copy `groupId` from your Push account when using `send_group_notification`.

### Team Management (Beta)

Manage team membership through the API:

- **Invite User**: Add a user to a team. Once the user has accepted the invite, all future notifications will be received by the user. Requires the account API key, a team API key, and the invitee's email.
- **Remove User/Revoke Invite**: Remove a user from a team or revoke a pending invite. Requires the same parameters as inviting.

## API Errors

Transport failures, HTTP failures, and responses without `success: true` are reported as errors. Provider error codes and messages are retained when available. A successful asynchronous acknowledgement is not proof of delivery.

## API Coverage

The integration covers all distinct operations in the documented notification and beta management APIs. URL-key webhook variants duplicate notification sending and are unnecessary because the integration sends API keys in headers. No read-only identity, account profile, group-list, or team-list endpoint is documented, so no discovery or identity tool is included.

No inbound event subscription API is documented.

## Official Documentation

- [API quickstart](https://docs.push.techulus.com/api-integration)
- [Account and team notifications](https://docs.push.techulus.com/api-documentation)
- [Synchronous request and response fields](https://docs.push.techulus.com/reference/notify)
- [Asynchronous acknowledgements](https://docs.push.techulus.com/reference/notify-async)
- [Device group notifications](https://docs.push.techulus.com/api-documentation-1)
- [Beta team membership API](https://docs.push.techulus.com/management-api-beta)
