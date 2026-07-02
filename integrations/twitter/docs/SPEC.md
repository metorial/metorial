Now I have enough information to compile the specification.

# Slates Specification for Twitter/X

## Overview

Twitter/X is a social media platform for public microblogging, direct messaging, and real-time public conversation. The X API (v2) provides programmatic access to read and publish posts, manage users and relationships, search content, access trends, handle direct messages, and stream real-time data. Access is available through tiered plans (Free, Basic, Pro, Enterprise) with varying levels of functionality and usage limits.

## Authentication

The X API v2 supports three authentication methods:

### 1. OAuth 2.0 Authorization Code Flow with PKCE (Recommended)

OAuth 2.0 is the modern standard for authentication and is recommended for all new development. It handles both public and private user data. This is used when acting on behalf of a user with fine-grained scopes.

- **Authorization URL:** `https://x.com/i/oauth2/authorize`
- **Token URL:** `https://api.x.com/2/oauth2/token`
- **Revoke URL:** `https://api.x.com/2/oauth2/revoke`
- **Grant type:** Authorization Code with PKCE
- **Credentials required:** OAuth 2.0 Client ID and Client Secret (obtained from Developer Portal app settings after enabling OAuth 2.0)
- **Redirect URI:** Must be configured in the Developer Portal under User Authentication Settings

Scopes allow you to set granular access for your App so that your App only has the permissions that it needs. Available scopes include:

- `tweet.read` – Read posts
- `tweet.write` – Create/delete posts
- `tweet.moderate.write` – Hide/unhide replies
- `users.read` – Read user profile info
- `users.email` – Read user email address
- `follows.read` – Read follows
- `follows.write` – Follow/unfollow users
- `like.read` – Read likes
- `like.write` – Like/unlike posts
- `dm.read` – Read direct messages
- `dm.write` – Send direct messages
- `list.read` – Read lists
- `list.write` – Manage lists
- `media.write` – Upload media
- `offline.access` – Obtain a refresh token
- `space.read` – Read Spaces
- `bookmark.read` – Read bookmarks
- `bookmark.write` – Manage bookmarks
- `block.read` – Read blocks
- `block.write` – Block/unblock users
- `mute.read` – Read mutes
- `mute.write` – Mute/unmute users

By default, the access token you create through the Authorization Code Flow with PKCE will only stay valid for two hours unless you've used the `offline.access` scope. Refresh tokens remain valid for six months.

### 2. OAuth 1.0a (User Context)

All write actions and all reading of protected data using the Twitter API require OAuth 1.0a, and the Access Tokens must belong to the owning user. This is a 3-legged OAuth flow.

- **Credentials required:** API Key (Consumer Key), API Secret (Consumer Secret), Access Token, Access Token Secret
- All four credentials can be generated in the Developer Portal under the "Keys and Tokens" tab for your app.
- If you are making a request on behalf of another user, you can obtain these Access Tokens via the 3-legged OAuth flow.
- Uses HMAC-SHA1 signature method.

### 3. OAuth 2.0 Bearer Token (App-Only)

OAuth 2.0 Bearer Token allows you to make API requests on behalf of your Twitter developer App. This authentication method is also sometimes referred to as "application-only authentication" because the credentials you send as part of the request give the API context about your developer App.

- Bearer token authentication is the simplest approach for accessing public data without user context. Use this when you're building tools that only need public information.
- A Bearer Token can be generated in the Developer Portal or programmatically using your API Key and Secret.

### Getting Started

Register for a Twitter Developer account at developer.twitter.com. Following approval, create a project and an application under the Developer Portal. This allows for the generation of API keys and access tokens necessary for authenticating requests.

## Features

### Post Management

Create, retrieve, delete, and search posts (tweets). Supports creating threaded posts (replies), quote posts, polls, and posts with media attachments. Search, retrieve, and publish posts. Access timelines, threads, and quote posts. Posts can include text up to 280 characters, images, videos, GIFs, and polls. The full-archive search feature allows searching posts back to 2006 (higher tiers only).

### User Management

Look up users, manage follows, blocks, and mutes. Retrieve user profiles, follower/following lists, and engagement metrics. Manage relationships (follow, unfollow, block, unblock, mute, unmute) on behalf of authenticated users.

### Timelines

Access a user's home timeline, user post timeline, mentions timeline, and reverse chronological timeline. Timelines return posts with configurable fields and expansions to control the data included in responses.

### Direct Messages

Send and receive private messages. Create new conversations, send messages in existing conversations, and retrieve message history. Supports one-to-one and group conversations.

### Lists

Create and manage curated lists of accounts. Add or remove members, follow/unfollow lists, and retrieve list details and membership.

### Bookmarks

Save and manage bookmarked posts for the authenticated user. Create and remove bookmarks and retrieve a user's bookmarked posts.

### Likes and Retweets

Like/unlike posts and retweet/undo retweet on behalf of an authenticated user. Retrieve users who liked or retweeted a specific post.

### Search and Filtering

Search for recent or historical posts using a powerful query language with operators for keywords, hashtags, mentions, URLs, language, author, conversation ID, and more. Build queries with operators for users, keywords, dates, and more.

### Trends

Access trending topics by location. Retrieve what is trending in specific geographic areas.

### Spaces

Find live audio conversations and their participants. Look up Spaces by ID, creator, or keyword.

### Filtered Stream

Receive posts in near real-time matching predefined rules via a persistent streaming connection. Define up to 1,000 filtering rules to receive only matching posts. Rules use the same query operators as search and can be added or removed without disconnecting. Useful for monitoring keywords, accounts, or topics at scale.

- Only available on paid tiers.

### Engagement Metrics

Access engagement metrics including impressions, likes, reposts, replies, and video views. Available as additional fields on post objects.

### Media Upload

Upload images, videos, and GIFs for attaching to posts. Media is uploaded separately and then referenced by media ID when creating a post.

## Events

The X API supports real-time event delivery through the **Account Activity API**, which uses webhooks.

### Account Activity (Webhook-based)

The Account Activity API (AAA) provides a way to receive real-time events related to X user accounts via webhooks. By subscribing specific user accounts to a pre-configured webhook, your application can be notified of various activities such as Posts, Direct Messages, Likes, Follows, Blocks, and more, from one or more of your owned or subscribed accounts through a single connection.

Events delivered include:

- **Post events:** Post creation, deletion by subscribed users
- **Engagement events:** Likes (favorites), retweets, quote tweets on subscribed user content
- **Mention events:** @mentions and replies involving subscribed users
- **Direct Message events:** Messages sent and received by subscribed users
- **Relationship events:** Follows, unfollows, blocks, unblocks, mutes, unmutes
- **Subscription revoke events:** When a user revokes app authorization

Setup requirements:

- To receive Account Activity events, you must register a webhook with a publicly accessible HTTPS URL.
- The Account Activity API challenge response check is a security feature put in place to ensure that the Account Activity API's activities are being sent to the proper developer. X will automatically send a CRC to your webhook URL once every 24 hours.
- Your app must have "Read, Write, and Access direct messages" permissions enabled.
- Account Activity API v2 currently does not support User Auth 2.0. OAuth 1.0a is required for webhook management.
- Available on Premium (sandbox with limited subscriptions) and Enterprise tiers. Enterprise supports thousands of account subscriptions per webhook.

### Filtered Stream (Streaming-based)

While not a traditional webhook, the Filtered Stream provides a persistent HTTP streaming connection that delivers matching posts in near real-time. You define rules (up to 1,000) and receive posts as they are published.

- Rules are defined using a query language with boolean operators for keywords, users, hashtags, language, location, etc.
- Rules can be added or removed without disconnecting the stream.
- Requires OAuth 2.0 Bearer Token (app-only) authentication.
- Available on paid tiers only.
