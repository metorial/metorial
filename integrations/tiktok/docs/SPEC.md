Now let me get details on the TikTok Research API and the webhook events for the Business API:# Slates Specification for TikTok

## Overview

TikTok is a short-form video social media platform. Its developer platform provides two main API ecosystems: the **TikTok for Developers** platform (for consumer-facing integrations like login, content posting, and video display) and the **TikTok API for Business** (for advertising, campaign management, audience targeting, and creator marketplace). TikTok API for Business is a series of interface services that allows developers to interact with TikTok Ads Manager, TikTok accounts, and TikTok Creator Marketplace functionalities.

## Authentication

TikTok uses **OAuth 2.0** for authentication across both its consumer and business API ecosystems.

### TikTok for Developers (Consumer APIs)

1. **Register an app** on the [TikTok Developer Portal](https://developers.tiktok.com) to obtain a **Client Key** and **Client Secret**.
2. The authorization endpoint is `https://www.tiktok.com/v2/auth/authorize/`. Include the `client_key`, `redirect_uri`, `scope`, and `response_type=code` as query parameters.
3. The token endpoint to exchange the authorization code for an access token is `https://open.tiktokapis.com/v2/oauth/token/`.
4. The access token is valid for 24 hours and the refresh token is valid for one year. Within one year you will need to refresh the access token with the refresh token on a daily basis. After one year you will need to ask the user to reauthorize.
5. Users need to pass the access token in the `Authorization` header with `Bearer` type.
6. Token revocation endpoint: `https://open.tiktokapis.com/v2/oauth/revoke/`

**Scopes** must be requested per app and approved by TikTok. Scopes represent end user granted permissions to access specific data resources or perform specific actions. Every TikTok for Developer API requires a scope to be accessed. Common scopes include:

- `user.info.basic` — basic profile info (avatar, display name)
- `user.info.profile` — extended profile info (bio, verification status)
- `user.info.stats` — follower/following counts
- `video.list` — read user's public videos
- `video.upload`, `video.publish` — post content to TikTok

### TikTok API for Business (Marketing/Ads APIs)

1. Register as a developer on the [TikTok Business API Portal](https://business-api.tiktok.com/portal).
2. Obtain an **App ID** and **Secret** for your business app.
3. The OAuth flow uses an `auth_code` that is exchanged for an access token at `https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/` using the `app_id`, `secret`, and `auth_code`.
4. The access token is passed via the `Access-Token` header in API requests.

### Research API

The Research API uses a Client Key and Client Secret provided upon project approval. A client access token is generated from these credentials and added in the authorization header to connect to Research API endpoints. This uses a **client credentials** flow (no user authorization required).

## Features

### Login Kit

Allows users to log in to third-party applications using their TikTok credentials. This simplifies authentication and helps developers personalize user experiences by integrating TikTok accounts.

- Grants access to basic user profile data (avatar, display name, open ID).
- Requires app approval from TikTok before going into production.

### User Profile Information

The Display API provides HTTP-based APIs to display a TikTok creator's videos and profile information. Retrieve user profile details including display name, avatar, bio, verification status, follower/following counts, and likes count.

- Different levels of profile data require different scopes (`user.info.basic`, `user.info.profile`, `user.info.stats`).

### Video Display & Querying

Retrieve metadata of a user's recently uploaded videos, or query specific videos by video ID. Video metadata includes cover image, title, description, embed link, view/like/comment/share counts, and creation time.

- Requires user authorization with the `video.list` scope.

### Content Posting

Enables users to seamlessly post content or upload drafts from your app to their TikTok profiles. Supports posting videos and photos.

- The Direct Post API enables "Share to TikTok" experiences. Content uploaded via this endpoint will be restricted to private viewing mode until the API client undergoes an audit to verify compliance with Terms of Service.
- Must check creator info (posting limits, max video duration, privacy options) before posting.
- Developers must allow users to set privacy level, interaction abilities (comments, duet, stitch), and commercial content disclosure.

### Share Kit

Enables users to share content from third-party apps directly to TikTok. This is a mobile SDK-based feature for iOS and Android.

### Video Embeds

Allows embedding TikTok videos and creator profiles on articles or websites.

### Research API

TikTok's Research Tools allow independent and academic researchers at non-profit institutions to access public data including videos (with engagement metrics, voice-to-text, subtitles), comments (text, likes, replies), and accounts (bios, profile pictures, follower/following counts).

- Query videos by hashtag, keyword, region, username, video length, date range, and more using boolean operators (AND, OR, NOT).
- Retrieve comments for specific videos.
- Look up public user profiles by username.
- Access is restricted to not-for-profit and/or independent research institutions. Currently available in the EU, with beta testing in the US, UK, Switzerland, Norway, Iceland, and Liechtenstein.

### Advertising & Campaign Management (Business API — Marketing API)

The Marketing API allows interacting with TikTok Ads Manager functionality at scale — programmatically querying data, creating and managing ads, and performing a variety of campaign management tasks.

- Create and manage campaigns, ad groups, and ads.
- Create, update, and manage audiences for targeting. Run reports on auction and reservation ads data.
- Manage creative assets in batch, leverage creative tools, and view creative performance data.
- Create and manage product catalogs including adding, updating, and removing products.

### Organic API (Business API)

The Organic API allows brands to manage their organic presence on TikTok and scale their efforts. It comprises the Accounts, Mentions, TikTok One (TTO), Discovery, and Spark Ads Recommendation APIs.

### Business Messaging API

The Business Messaging API allows optimizing messaging strategies and leveraging real-time messaging to strengthen relationships with users. It empowers developers to create messaging solutions that drive engagement and bridge organic interactions with paid advertising.

### Creator Marketplace API

Enables influencer marketing platforms and developers to programmatically create boosted TikToks from creator content.

### Commercial Content API

TikTok provides commercial content APIs that include ads, ad and advertiser metadata, and targeting information for transparency purposes.

- Allows performing customized searches on ads and other commercial content data. Available only to approved researchers.

### Data Portability API

Allows users to transfer their data from TikTok to your app. Available only to TikTok users in the EEA and UK.

### Conversion API (Events API)

TikTok has a Conversion API (Events API) that allows advertisers to share marketing data from their servers, websites, apps, or CRMs with TikTok. It works alongside the TikTok pixel to provide more comprehensive conversion tracking.

## Events

TikTok supports webhooks across both its consumer developer platform and business API.

### TikTok for Developers Webhooks

Webhooks notify your application via a callback URL when an event happens in TikTok, rather than requiring you to pull information via API. By default, you are subscribed to all events when a callback URL is configured in the TikTok Developer Portal.

**Authorization Events**

- `authorization.removed` — Fired when a user's account is deauthorized from your application. The access token will have already been revoked when this is received.

**Video Events**

- `video.upload.failed` — Fired when a video uploaded via Video Kit fails to upload in TikTok.
- `video.publish.completed` — Fired when a video has been successfully published to TikTok.

**Data Portability Events**

- `portability.download.ready` — Fired when data requested via the Data Portability API is ready for download.

### TikTok API for Business Webhooks

The Business API supports webhook subscriptions for real-time updates for leads, ad review status, and TikTok Creator Marketplace orders.

**Lead Generation Events**

- TikTok provides webhooks for integrating lead management systems with TikTok Lead Generation, allowing real-time notifications about lead content directly in your CRM.

**Ad Review Status Events**

- Notifications when ads are approved or rejected during the review process.

**Creator Marketplace Order Events**

- Updates on the status of Creator Marketplace collaboration orders.
