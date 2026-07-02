Now let me get the full list of webhook resources and the service app details:# Slates Specification for Cisco Webex

## Overview

Cisco Webex is a cloud-based collaboration platform providing messaging, video meetings, calling, and device management. Webex is a cloud service providing persistent chat, room-based collaboration, WebRTC video conferencing, and more. The platform exposes a comprehensive REST API at `webexapis.com` covering messaging, meetings, calling, administration, and device control.

## Authentication

Webex supports multiple authentication methods, all resulting in Bearer tokens passed via the `Authorization` header.

### OAuth 2.0 (Integrations)

Integrations are how you request permission to invoke the Webex REST API on behalf of another Webex user. The API supports the OAuth 2 standard which allows third-party integrations to get a temporary access token for authenticating API calls instead of asking users for their password.

Webex currently supports the following OAuth flows for integrations: Authorization Code Flow and Authorization Code Flow with PKCE for devices with a web browser and keyboard. Authorization Code Flow with PKCE is the recommended flow as it provides the best security. Device Grant Flow is designed for smart TVs and other devices without a web browser or with limited input abilities.

Authorization_code is the only supported grant type and there are currently no plans to add others. The client credentials grant is not supported.

**Endpoints:**

- Authorization: `https://webexapis.com/v1/authorize`
- Token exchange: `https://webexapis.com/v1/access_token`

**Credentials required:**

- Client ID and Client Secret (generated when registering an integration at developer.webex.com)
- Redirect URI

**Token lifecycle:**

- By default, the access token is valid for 12 hours and the refresh token is valid for 60 days. Refreshing the access token also renews the refresh token lifetime.

**Scopes:**
Scopes define access levels. Key scope categories include:

- `spark:messages_read`, `spark:messages_write` — messaging
- `spark:rooms_read`, `spark:rooms_write` — spaces/rooms
- `spark:memberships_read`, `spark:memberships_write` — space memberships
- `spark:people_read` — people/user directory
- `meeting:schedules_read`, `meeting:schedules_write` — meetings
- `meeting:recordings_read`, `meeting:recordings_write` — recordings
- `spark:calls_read`, `spark:calls_write` — calling
- `spark:all` — broad access including SDK calling features
- Scopes that begin with `spark-admin` can only be used by users with administrative access to an organization. Requesting these scopes during a grant flow will not give non-admin users access to administrative functions.
- The `spark-compliance` scopes can only be used by an organization's compliance officers.

### Bot Tokens

Bots are similar to regular Webex users. They can participate in 1-to-1 and group spaces and users can message them directly or add them to a group space. A special badge is added to a bot's avatar in the Webex clients so users know they're interacting with a bot instead of a human.

Bots receive a permanent access token upon creation at developer.webex.com. Bots do not, however, perform actions within Webex on behalf of a Webex user. Bot tokens do not require the OAuth flow and do not expire (though they can be regenerated).

### Service App Tokens

A service app token gives an application administrative access to a specific Webex organization after being granted permission by an administrative user in that organization. As long as a service app is authorized in a given organization, it continues to have access until revoked by an administrator. The access is not based on the specific person who granted the access, so its access is retained even if users leave the organization.

Service apps use a Client ID and Client Secret, but require an org admin to authorize the app first. After authorization, access and refresh tokens are issued and must be maintained (refreshed) similarly to integration tokens.

### Personal Access Tokens

In a production app, you create a Webex Integration and use OAuth to obtain an access token. For testing purposes, however, you can get a personal access token from the Developer Portal you can use to make API calls on your own behalf. These are short-lived (12 hours) and intended only for development/testing.

## Features

### Messaging (Spaces, Messages, and Teams)

Allows creating and managing spaces (rooms), posting messages (text, Markdown, file attachments, and Adaptive Cards), and managing space memberships. Teams can group multiple spaces together. A bot can only access messages sent to it directly. In group spaces, bots must be @mentioned to access the message.

### Meetings

The Webex Meetings REST API enables seamless integration of Webex Meetings into your websites, apps, and services. Schedule meetings, invite meeting attendees, update preferences, and more. Supports managing meeting invitees, meeting preferences, meeting polls, Q&A, chat, closed captions, and transcripts. Admin-scoped tokens allow managing meetings on behalf of other users in the organization via the `hostEmail` parameter.

### Recordings and Transcripts

Access and manage meeting recordings and transcripts. Includes converged recordings that unify recording resources. Recordings can be listed, retrieved, and deleted. Transcripts can be accessed when available.

### People and Organization Management

Query user details, list people in an organization, and manage organization settings. Admin scopes allow managing licenses, roles, groups, and organization contacts.

### Calling (Webex Calling)

Manage call controls, call settings, voicemail, call routing, call queues, hunt groups, auto attendants, and other telephony features. Includes personal call settings (call forwarding, do not disturb, etc.) and location-level call settings. Telephony_calls, telephony_conference, and telephony_mwi webhooks only provide notifications for Webex Calling users.

### Devices and Workspaces

Control and configure Webex RoomOS devices, manage device configurations, and workspace settings. Integrate with room automation, create custom UI controls, and deploy on-board macros. Devices must be cloud-registered and registered to a workspace.

### Administrative Features

Manage hybrid services (clusters, connectors), admin audit events, security audit events, tracking codes, session types, space classifications, resource groups, reports, and historical analytics. Includes domain management and emergency services settings.

### Adaptive Cards and Attachment Actions

Send interactive Adaptive Cards in messages and receive user responses via attachment actions. This enables building rich interactive experiences within Webex clients, including forms, buttons, and dropdowns.

### Compliance

Compliance officers can access events, messages, and files across the entire organization for data loss prevention and regulatory compliance purposes.

## Events

A webhook is an HTTP callback, or an HTTP POST, to a specified URL that notifies your app when a particular activity or "event" has occurred in one of your resources on the Webex platform. The benefit of using webhooks is that they allow your application to receive real-time data from Webex, so you can keep up with the state of your resources (i.e. rooms, messages, memberships, etc.).

Webhooks are created via the `/v1/webhooks` API by specifying a resource, event type, target URL, and optional filters. A secret can be provided to generate payload signatures for verification. Webhooks also support a "firehose" or "wildcard" webhook, which allows your app to subscribe to several commonly-used resources and/or events with a single webhook.

If Webex does not receive a successful HTTP response in the 2xx range from the server, your webhook will be disabled after 100 failed attempts within a five minute period.

### Messages

Notifications when messages are created, updated, or deleted in spaces. Can be filtered by `roomId`, `roomType`, `personId`, or `personEmail`.

### Rooms (Spaces)

Notifications when rooms/spaces are created, updated, or deleted. Also supports a `migrated` event when a room is moved to a different geography.

### Memberships

Notifications when memberships are created, updated, or deleted (i.e., when users join, are updated in, or leave spaces).

### Attachment Actions

Notifications when a user submits an Adaptive Card (attachment action created).

### Meetings

Notifications when meetings are started or ended, and when meetings are created, updated, or deleted. Can be filtered by `siteUrl` or `hostUserId`. Integrations acting on-behalf of an admin need to have the Admin level scope to register org wide webhooks.

### Meeting Participants

Notifications when participants join or leave a meeting. Can be filtered by `hostPersonId` or `meetingId`.

### Meeting Transcripts

Notifications when meeting transcripts are created. Can be filtered by `hostUserId` or `siteUrl`.

### Recordings

Notifications when recordings are created, updated, or deleted. Can be filtered by `hostUserId` or `siteUrl`.

### Telephony Calls

Notifications for Webex Calling users when calls are created, updated, or deleted (originated, received, or ended). Only available for Webex Calling users.

### Telephony Conference

Notifications for conference call events for Webex Calling users.

### Telephony MWI (Message Waiting Indicator)

Notifications for voicemail message waiting indicator changes for Webex Calling users.

### Additional Org-Level Resources

Org-level webhooks are supported for meetings, recordings, convergedRecordings, meetingParticipants, meetingTranscripts, videoMeshAlerts, controlHubAlerts, rooms, messaging, and adminBatchJobs resources. These require admin-level scopes.
