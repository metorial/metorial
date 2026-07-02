# Slates Specification for Microsoft Teams

## Overview

Microsoft Teams is a chat-based collaboration workspace in Microsoft 365 that provides messaging, meetings, calling, file sharing, and integrations with other Microsoft 365 services. The Microsoft Graph API is used to integrate with Microsoft Teams features, exposing Teams data through a unified REST endpoint at `https://graph.microsoft.com/v1.0`. Microsoft Teams provides built-in access to team-specific calendars, files, OneNote notes, Planner plans, Shifts schedules, and more.

## Authentication

Microsoft Teams APIs are accessed through Microsoft Graph, which uses **OAuth 2.0** via the Microsoft Identity Platform (Microsoft Entra ID, formerly Azure AD).

### Prerequisites

- Register an application in the **Microsoft Entra admin center** (Azure AD App Registrations).
- Obtain a **Client ID** (Application ID) and **Client Secret** from the registered application.
- Configure **Redirect URIs** for your application.

### OAuth 2.0 Endpoints

The Token Request URL is `https://login.microsoftonline.com/common/oauth2/v2.0/token` and the Authorize URL is `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`.

Replace `common` with a specific **Tenant ID** to restrict authentication to a single organization, or use `organizations` for any work/school account.

### Supported Flows

- **Authorization Code Flow (Delegated)**: In delegated access, the app calls Microsoft Graph on behalf of a signed-in user. This is the most common flow for user-facing integrations.
- **Client Credentials Flow (Application)**: In app-only access, the app calls Microsoft Graph with its own identity, without a signed-in user. Requires admin consent for all requested permissions.

### Permissions (Scopes)

Microsoft Graph exposes delegated permissions and application permissions. Delegated permissions, also called scopes, work in the delegated access scenario.

Key Teams-related scopes include:

- `Team.ReadBasic.All` — Read basic team properties
- `TeamSettings.Read.All` / `TeamSettings.ReadWrite.All` — Read or modify team settings
- `Channel.ReadBasic.All` / `Channel.Create` / `Channel.Delete.All` — Manage channels
- `Chat.Read` / `Chat.ReadWrite` — Read or send chat messages
- `ChatMessage.Read` / `ChatMessage.Send` — Read or send channel/chat messages
- `ChannelMessage.Read.All` / `ChannelMessage.Send` — Read or send messages in channels
- `OnlineMeetings.Read` / `OnlineMeetings.ReadWrite` — Manage online meetings
- `Presence.Read.All` — Read user presence
- `User.Read` — Read signed-in user profile
- `offline_access` — Obtain refresh tokens

Delegated permissions are added to the "scope" parameter and can either require admin consent or not. Application permissions all require an admin to consent.

### Resource-Specific Consent (RSC)

RSC permissions are supported by a subset of features available through Microsoft Graph such as Teams, chats, and messages. RSC permissions are only available to Teams apps installed on the Teams client and are declared in the app manifest (JSON) file.

## Features

### Team Management

Create, update, archive, unarchive, clone, and delete teams. Microsoft Graph makes it easy to create large numbers of teams and populate them with users and channels, by automating the creation and management of teams, channels, tabs, and apps. Teams can be created from templates or converted from existing Microsoft 365 groups. All teams are backed by Microsoft 365 groups.

### Channel Management

Create, update, and delete channels within teams. Supports standard, private, and shared channel types. Events include updating the display name of a channel, creating a private channel in a team, and sharing/unsharing a shared channel with another team.

### Messaging

Send, read, update, and delete messages in channels and chats. Change notifications enable you to subscribe to changes (create, update, and delete) to messages in a channel or chat. Supports rich message content including Adaptive Cards, file attachments, and mentions. There are specific API operations that allow you to import historical message data from other platforms into new teams whilst preserving the original date, time, and contributor.

### Chat Management

Create and manage one-on-one, group, and meeting chats. Read and send messages within chats. List chats for a user and manage chat members.

### Membership Management

Add, remove, and update team and channel members, including owners and guests. Change notifications enable you to subscribe to membership changes (create, update, and delete) in a team. You can get notified whenever a member is added, removed, or updated in a team.

### Online Meetings and Calling

Create, read, update, and delete online meetings. Calling and online meeting APIs apply only to Microsoft Teams. Supports IVR scenarios such as playing audio prompts, recording responses, and transferring calls. Access call recordings and transcripts.

### Presence

Read user presence status (availability and activity) in real time. Change notifications in Microsoft Graph enable you to subscribe to changes in user presence information in Microsoft Teams.

### Tabs and Apps

Install, update, and remove apps in teams and chats. Create tabs in channels to give users easy access to apps. Manage tab configurations within channels.

### Shifts (Workforce Management)

Shifts and its API give employers and frontline workers real-time visibility into schedules based on worker availability, and let them adjust schedules to their team's needs. Manage schedules, shifts, time-off requests, swap requests, and time cards.

### Tags

Create, update, and delete tags for teams. Manage tag members to group users and enable @mentions for subsets of a team.

### Activity Feed Notifications

Send custom activity feed notifications to users in the Teams client, enabling apps to surface relevant information directly in the user's activity feed.

### Reports

Usage data available in the Microsoft 365 Admin Centre is exposed via a dedicated "/reports" section. Within this are API calls to track usage of Microsoft Teams, Outlook, and Yammer, and discover usage by individual users over time.

## Events

Microsoft Teams supports change notifications (webhooks) through the Microsoft Graph subscriptions API. The Microsoft Graph REST API can deliver change notifications to clients through various endpoints, including webhooks, Event Hubs, and Event Grid.

Subscriptions are created via `POST /subscriptions` with a specified `notificationUrl` (webhook endpoint), `resource` path, `changeType`, and `expirationDateTime`. Subscriptions have a limited lifetime. Apps need to renew their subscriptions before the expiration time. Teams change notification subscriptions have a maximum lifetime of 60 minutes unless lifecycle notification URLs are provided.

### Channel Messages

Subscribe to changes (create, update, and delete) to messages in a channel or chat. Can subscribe to messages in a specific channel (`/teams/{team-id}/channels/{channel-id}/messages`) or across all channels in a tenant (`/teams/getAllMessages`). Tenant-wide subscriptions may have licensing and payment requirements.

### Chat Messages

Subscribe to message changes in a specific chat (`/chats/{chat-id}/messages`) or across all chats in a tenant (`/chats/getAllMessages`). Supports rich notifications with encrypted resource data.

### Chat Changes

To get change notifications for all changes (create and update) related to any chat in a tenant, subscribe to /chats. Can also subscribe to chats for a specific user.

### Team Changes

To get change notifications for all changes (create, update, and delete) related to any team in a tenant, subscribe to /teams. Can also subscribe to a specific team (`/teams/{team-id}`).

### Channel Changes

To get change notifications for all changes (create, update, and delete) related to any channel in a tenant, subscribe to /teams/getAllChannels. Can also subscribe to channels within a specific team.

### Membership Changes

To get change notifications for membership changes in a particular team, subscribe to /teams/{team-id}/members. This resource supports including resource data in the notification. Can also subscribe across all teams (`/teams/getAllMembers`) or for chat members.

### Presence Changes

Use webhooks to subscribe to users' presence information and get notifications when changes occur. Subscribe to individual users or bulk subscribe to up to 650 users in a single subscription. Maximum subscription expiration is one hour.

### Meeting Call Events

Subscribe to call started/ended and call roster updates for Microsoft Teams online meetings. Requires the meeting's join web URL to create the subscription.

### Call Recordings and Transcripts

Subscribe to new recordings and transcripts for online meetings at the tenant level or for meetings where a specific Teams app is installed. The notification for a transcript is sent only if the subscription happens before the transcription starts.
