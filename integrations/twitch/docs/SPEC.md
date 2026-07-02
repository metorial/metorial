# Slates Specification for Twitch

## Overview

Twitch is a live-streaming platform primarily focused on gaming, esports, and creative content, owned by Amazon. Its API (called the Helix API) allows developers to programmatically manage channels, streams, chat, subscriptions, moderation, and viewer engagement features. The platform serves over 140 million monthly active users and 10 million content creators.

## Authentication

Twitch APIs use OAuth 2.0 access tokens to access resources. The Twitch API supports two types of access tokens: **user access tokens** and **app access tokens**.

### Prerequisites

All Twitch integrations require you to register your app with Twitch via the Developer Console. After registration, capture your **Client ID** and generate a **Client Secret**. Two-factor authentication must be enabled on the developer's Twitch account.

### Token Types

- **User Access Tokens**: Used for APIs that require the user's permission to access resources. Twitch uses scopes to identify the resources your app needs permission to access. Obtained via the Authorization Code Grant flow (server-side apps) or Implicit Grant flow (client-side apps).
- **App Access Tokens**: Used for APIs that don't require the user's permission to access resources. To get an app access token, use the Client Credentials Grant flow.

### OAuth Endpoints

- **Authorization**: `https://id.twitch.tv/oauth2/authorize` — Redirect users here to authorize your app. Include `client_id`, `redirect_uri`, `response_type`, and `scope` parameters.
- **Token**: `https://id.twitch.tv/oauth2/token` — To get an access token, send an HTTP POST request to this endpoint with `client_id`, `client_secret`, `grant_type`, and (for auth code flow) `code` parameters.
- **Validation**: `https://id.twitch.tv/oauth2/validate` — Any third-party app that calls the Twitch APIs and maintains an OAuth session must call the /validate endpoint to verify that the access token is still valid. Your app must validate the OAuth token when it starts and on an hourly basis thereafter.
- **Revocation**: `https://id.twitch.tv/oauth2/revoke`

### API Request Format

All API requests go to `https://api.twitch.tv/helix/` and must include both an `Authorization: Bearer <access_token>` header and a `Client-Id: <client_id>` header.

### OIDC Support

Twitch offers two protocols, OAuth and OIDC, to connect and obtain a token. OIDC can return an ID Token for user identity verification in addition to the standard access token. The major caveat with OIDC is that it does not support the return of app access tokens. OIDC endpoints use `https://id.twitch.tv/oauth2/authorize` with `openid` in scopes.

### Scopes

Scopes are space-delimited and URL-encoded in the authorization request. An application must request only the scopes required by the APIs that their app calls. If you request more scopes than is required to support your app's functionality, Twitch may suspend your application's access to the Twitch API.

Key scope categories include:

- **Analytics**: `analytics:read:extensions`, `analytics:read:games`
- **Bits**: `bits:read`
- **Channel management**: `channel:manage:broadcast`, `channel:manage:schedule`, `channel:manage:videos`, `channel:manage:raids`, `channel:manage:ads`, `channel:edit:commercial`
- **Channel reading**: `channel:read:subscriptions`, `channel:read:editors`, `channel:read:goals`, `channel:read:hype_train`, `channel:read:polls`, `channel:read:predictions`, `channel:read:charity`, `channel:read:ads`, `channel:read:vips`
- **Channel Points**: `channel:read:redemptions`, `channel:manage:redemptions`
- **Chat**: `user:read:chat`, `user:write:chat`, `channel:bot`, `user:bot`
- **Clips**: `clips:edit`, `channel:manage:clips`
- **Moderation**: `channel:moderate`, `moderation:read`, `moderator:manage:banned_users`, `moderator:manage:automod`, `moderator:manage:chat_messages`, `moderator:manage:blocked_terms`, `moderator:manage:chat_settings`, `moderator:read:chatters`, `moderator:read:followers`, `moderator:manage:shield_mode`, `moderator:manage:shoutouts`, `moderator:manage:warnings`, `moderator:read:suspicious_users`
- **Polls & Predictions**: `channel:manage:polls`, `channel:manage:predictions`
- **User**: `user:edit`, `user:read:email`, `user:read:follows`, `user:read:subscriptions`, `user:read:blocked_users`, `user:manage:blocked_users`, `user:read:emotes`, `user:manage:whispers`

## Features

### User & Channel Information

Retrieve user profiles (display names, profile images, descriptions, account creation dates) and channel details (title, category/game, language, content classification labels). Update channel information like title, game, and language for the authenticated broadcaster.

### Live Streams

Access real-time data about active streams including viewer count, game being played, stream title, and start time. Query streams by game, user, or language. Retrieve stream keys for authenticated broadcasters.

### Subscriptions & Followers

View subscriber lists with subscription tier, gifted status, and duration. Check individual subscription status. Retrieve follower lists with follow dates. Requires broadcaster-level authorization.

### Chat & Messaging

Send and read chat messages via EventSub. Manage chat settings (emote-only, follower-only, slow mode, subscriber-only). Send announcements, whispers, and shoutouts. Build chatbots using either WebSocket or webhook-based EventSub transports.

### Moderation

Ban/unban users, manage timeouts, delete messages, and manage moderator and VIP roles. Configure AutoMod settings and manage blocked terms. Review messages held by AutoMod. Manage unban requests. Track suspicious users. Issue user warnings. Activate/deactivate Shield Mode.

### Clips & Videos

Create clips from live streams or VODs. Retrieve clip information filtered by broadcaster, game, or clip ID. Manage and delete videos. Download clips.

### Channel Points

Create, update, and delete custom channel points rewards. View reward redemptions and update redemption status (fulfill/cancel). Monitor automatic reward redemptions.

### Polls & Predictions

Create and manage polls with configurable duration and voting options (including Bits and Channel Points voting). Create and manage channel predictions with multiple outcomes and Channel Points wagering. End or cancel active polls and predictions.

### Hype Trains

Monitor Hype Train activity including begin, progress, and end states. Access top contributor information, current level, and progress toward goals.

### Raids

Initiate and cancel raids to other channels programmatically.

### Scheduling

Manage broadcast schedules including creating, updating, and deleting schedule segments. View existing schedules for channels.

### Analytics & Insights

Access extension and game analytics reports as downloadable CSV files. View Bits leaderboards. Access creator goals and their progress.

### Charity Campaigns

View active charity campaign details, donation amounts, and fundraising goals.

### Extensions

Manage Twitch Extensions on channels including activation/deactivation and configuration. Access extension-specific analytics and manage Bits-in-Extensions transactions.

### Drops

Manage Drop entitlements for games. Track when users earn Drop rewards through viewing.

### Ads

Read ad schedules and snooze upcoming ad breaks. Receive notifications when midroll commercial breaks begin.

### Shared Chat

Monitor shared chat sessions between multiple channels, including session lifecycle events.

## Events

Twitch provides a comprehensive event system called **EventSub** that supports two transport methods: webhooks (HTTPS callbacks) and WebSocket connections. Additionally, a **Conduit** transport is available for managing multiple shards at scale. Twitch sends event notifications at least once, but if Twitch is unsure of whether you received a notification, it'll resend the event.

Subscriptions are created via the Create EventSub Subscription API endpoint. Each subscription specifies a type, condition (e.g., `broadcaster_user_id`), and transport method. You can only subscribe to events over WebSockets transport using a User Access Token. You can only subscribe to events over Webhook transport using an App Access Token. Webhook callbacks must support HTTPS.

### Channel Events

Notifications for channel property changes (title, category, language, content labels), follows, raids (incoming and outgoing), and ad break starts. Configurable by `broadcaster_user_id`.

### Subscription Events

Notifications for new subscriptions, resubscriptions (with messages), subscription gifts, and subscription ends. Includes tier information and gift metadata.

### Bits & Monetization Events

Notifications for Bits usage (cheers, power-ups, combos) and Extension Bits transactions on a channel.

### Chat Events

Real-time notifications for chat messages, message deletions, chat clears (full or per-user), chat notification events (sub messages, raids appearing in chat), and chat settings changes. Also covers shared chat session lifecycle (begin, update, end).

### Moderation Events

Notifications for bans, unbans, timeouts, moderator actions (aggregated), moderator/VIP role additions and removals, unban request creation and resolution, user warnings (sent and acknowledged), and suspicious user activity.

### AutoMod Events

Notifications when messages are held by AutoMod for review, when held message statuses change, when AutoMod settings are updated, and when blocked terms are modified. Users can also receive notifications about their own messages being held.

### Channel Points Events

Notifications for custom reward creation, updates, and removals. Notifications when viewers redeem custom or automatic channel points rewards, and when redemption statuses are updated.

### Polls & Predictions Events

Lifecycle events for polls (begin, progress, end) and predictions (begin, progress, lock, end) on a channel.

### Hype Train Events

Lifecycle notifications for Hype Trains including begin, progress updates, and completion with level and contributor data.

### Goal Events

Notifications when a broadcaster begins, makes progress on, or ends a creator goal (e.g., follower or subscriber goals).

### Charity Campaign Events

Notifications for charity campaign starts, progress, stops, and individual donations.

### Shield Mode Events

Notifications when Shield Mode is activated or deactivated on a channel.

### Shoutout Events

Notifications when a broadcaster sends or receives a shoutout.

### Stream Events

Notifications when a stream goes online or offline for a specified broadcaster. No authorization required.

### User Events

Notifications for user account updates, OAuth authorization grants and revocations for your app, and whisper messages received.

### Drop Events

Notifications when Drop entitlements are granted to users. Webhook transport only. Events are batched.

### Conduit Events

Notifications when EventSub disables a conduit shard due to transport issues.
