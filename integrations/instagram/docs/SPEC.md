# Slates Specification for Instagram

## Overview

Instagram is a visual social media platform owned by Meta, with over 2 billion monthly active users. The Instagram Graph API is the primary interface for developers, businesses, and creators who need programmatic access to Instagram data and functionality. With the deprecation of the Basic Display API completed, all Instagram integrations must now use either the Instagram Graph API or the Instagram Messaging API.

## Authentication

Instagram uses **OAuth 2.0** for authentication. There are two authentication flows, both requiring a Meta (Facebook) App created in the Meta for Developers dashboard.

### Prerequisites

- Requires an Instagram Business or Creator Account.
- Personal accounts are no longer able to access the API after late 2024.
- A registered Facebook App configured in the Meta for Developers portal.

### Method 1: Instagram Login (Business Login)

The Business Login approach uses OAuth 2.0 to authenticate users directly through Instagram. This method generates Instagram User access tokens that represent a specific Instagram Business or Creator account's permissions. The Instagram Platform API allows direct authentication with Instagram accounts without requiring a Facebook Page connection.

- **Authorization URL:** `https://www.instagram.com/oauth/authorize`
- **Token Exchange URL:** `https://api.instagram.com/oauth/access_token`
- **Credentials:** App ID (Client ID) and App Secret from the Meta Developer portal, plus a Redirect URI.
- **Scopes (permissions):**
  - `instagram_business_basic` — Read basic profile and media data
  - `instagram_business_content_publish` — Publish media
  - `instagram_business_manage_messages` — Manage direct messages
  - `instagram_business_manage_comments` — Manage comments
  - `instagram_business_manage_insights` — Access analytics and insights

### Method 2: Facebook Login for Business

The Instagram API with Facebook Login for Business allows users of your app to access data in their Instagram Business and Instagram Creator accounts that are linked to a Facebook Page. This method is common for enterprise applications managing multiple accounts.

- **Authorization URL:** `https://www.facebook.com/v{version}/dialog/oauth`
- **Token Exchange:** Via Facebook's OAuth endpoints.
- **Credentials:** Facebook App ID and App Secret, plus a Redirect URI.
- **Scopes (permissions):**
  - `instagram_basic` — Read basic Instagram profile and media data
  - `instagram_content_publish` — Publish content
  - `instagram_manage_comments` — Manage comments
  - `instagram_manage_insights` — Access analytics and insights
  - `instagram_manage_messages` — Manage direct messages
  - `pages_show_list` — List managed Facebook Pages
  - `pages_read_engagement` — Read Page metadata needed to resolve the linked Instagram professional account
  - `pages_manage_metadata` — Manage page metadata (required for webhooks)

### Token Lifecycle

The token you receive is short-lived (typically 1 hour). Exchange it for a long-lived token (60 days). Long-lived tokens can be refreshed before they expire. Apps must go through Meta's App Review process to gain Advanced Access for production use with external users.

## Features

### Content Publishing

The Graph API's publishing endpoints help brands to post and schedule media directly. Apps can create media containers for images, videos, or carousels and then publish them to the Instagram Feed via API calls. Instagram now treats Reels and Stories as publishable media types. Publishing follows a two-step process: first create a media container, then publish it. Apps can also inspect the content publishing limit endpoint to avoid publishing-window quota failures.

### Media Management

Retrieve and manage media (photos, videos, Reels, Stories, carousels) from an Instagram account. Access metadata such as captions, media URLs, timestamps, and permalinks. Supports product tagging on media for commerce use cases.

### Comment Moderation

Features include: retrieving comments and replies on media, creating top-level comments, replying to comments, deleting comments, hiding/unhiding comments, and enabling/disabling comments on media. Requires the `instagram_manage_comments` permission.

### Insights and Analytics

The API provides detailed analytics, offering a better understanding of performance. Businesses can access valuable insights, keeping track of their organic content's performance more effectively on third-party tools. Available metrics include reach, views, likes, comments, saves, shares, total interactions, and audience demographics depending on media type, period, and API version. Story insights include exits, replies, reach, taps forward/back, and impressions where supported.

### Hashtag Search

Using the Hashtag Search API, an app can fetch recent public posts tagged with a specific hashtag. This is the only public content search allowed by Instagram's API.

### Mentions and Business Discovery

Through the Business Discovery and Mentions endpoints, you can retrieve posts where your brand's Instagram handle has been mentioned. Business Discovery also allows retrieving basic metadata and metrics about other Instagram Business and Creator accounts.

### Messaging (Instagram DM API)

This API allows your app to send and receive messages from businesses and creators to Instagram users interested in their business or media. Meta's core policy states that after a user initiates a conversation by sending you a message, you have a 24-hour window to send them messages freely. Once that window closes, you cannot send promotional messages until the user messages you again.

- Supports text, media files, and story replies.
- Private replies to users who commented on posts.
- Human-agent escalation is supported.

### Ads Management

The Instagram Ads API, being a part of Meta's marketing API, is used for managing, optimizing, and reporting Instagram campaigns. Requires additional permissions and is primarily used by agencies and advertising platforms.

## Events

Instagram supports webhooks through the Meta Graph API Webhooks infrastructure. Webhooks are configured in the Meta for Developers portal by subscribing to the `instagram` object and selecting specific fields.

### Comments

Receive real-time notifications when comments are added to media owned by your app's users. The webhook payload includes the comment text and comment ID.

### Mentions

Receive notifications when your Instagram account is @mentioned in other users' media or comments. The payload includes the comment ID and media ID of the mention.

### Story Insights

If you want to get the latest insights for a story before it expires, set up a Webhook for the Instagram topic and subscribe to the `story_insights` field. The payload includes metrics such as exits, replies, reach, taps forward, taps back, and impressions.

### Messaging

Subscribe to the `messages` field to receive real-time notifications when direct messages are sent to your Instagram account. This is part of the Messenger Platform's webhook infrastructure and requires the `instagram_manage_messages` permission and a linked Facebook Page.

- Requires a callback URL (HTTPS) and a verify token for endpoint verification.
- Webhook subscriptions are managed via the `/{app-id}/subscriptions` endpoint or the Meta Developer dashboard.
- Instagram does not officially provide a webhook specifically for monitoring "new posts."
