# Slates Specification for Ayrshare

## Overview

Ayrshare is a unified social media API that allows developers to manage social media operations across 13 platforms (Facebook, X/Twitter, Instagram, LinkedIn, TikTok, YouTube, Reddit, Telegram, Pinterest, Snapchat, Google Business Profile, Threads, and Bluesky) through a single integration. Instead of dealing with 13 different social media APIs, it provides one API to schedule posts, get analytics, manage comments, send direct messages, create ads, and more.

## Authentication

### API Key (Bearer Token)

Ayrshare authenticates API requests via an Authorization token passed in the HTTP header. The API Key must be sent with the `Bearer` prefix. The API Key can be found in the Ayrshare Dashboard by switching to your Primary Profile.

**Header format:**

```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

### Profile Key (for multi-user / Business Plan)

When operating on behalf of a specific user, a Profile Key is returned when creating a user profile. This key is used to post on the user's behalf and manage their account. It is passed as an additional header:

```
Profile-Key: <PROFILE_KEY>
```

### JWT for Social Account Linking (Business Plan)

Ayrshare uses a JWT (JSON Web Token) to authenticate users and perform Single Sign-On to the social linking page. The JWT is constructed from your API Key, user Profile Key, and a few other parameters, and signed with your 1024-bit private key. This is only used to generate a URL where end-users can connect their social media accounts — it is not used for regular API calls.

### BYO OAuth Credentials for X/Twitter

Starting March 31, 2026, all X/Twitter operations through Ayrshare require your own OAuth 1.0a credentials. Four additional headers must be passed alongside the Authorization header for any request targeting X/Twitter.

## Features

### Post Publishing & Scheduling

Publish text, image, and video posts to one or multiple social networks simultaneously. Posts can be sent immediately or scheduled for a future date or time. Supports platform-specific options such as carousel posts, visibility settings, and link shortening.

### Analytics

Get advanced analytics for users and post links including likes, retweets, and clicks. Analytics can be retrieved at the post level across platforms, as well as account-level metrics.

### Comment Management

Retrieve, post, and manage comments on posts. Supports deleting comments and replying to comments. Available for Facebook, Instagram, LinkedIn, Reddit, TikTok, X/Twitter, and YouTube.

### Direct Messaging

Send text, images, and videos via direct messages, get all conversation messages, and set up message auto responses. Available for Facebook and Instagram, with X/Twitter messaging available for Enterprise clients.

### Reviews Management

Get, respond to, and delete reviews on Facebook Pages and Google Business Profile.

### User Profile Management (Business Plan)

The Business Plan allows creating, managing, and posting on behalf of client profiles via the API or Dashboard GUI. Multiple User Profiles can be created and associated to manage multiple social media accounts across the same platforms, allowing for targeted posting and analytics retrieval for each specific account.

### RSS Feed Integration

Subscribe to RSS feeds and have new items automatically posted to social networks, or receive webhook notifications when new feed items are found.

### Media Hosting

Publicly accessible URLs are required to post videos and images to social networks. If you do not have media hosting, Ayrshare can handle it — upload media files and Ayrshare returns a URL you can use.

### Auto Hashtag Generation

Automatically add hashtags to posts based on the most relevant keywords, taking into account real-time hashtag popularity.

### Link Shortening

Shorten links in posts across all platforms, similar to bit.ly. Enabled by default and only shortens URLs starting with http or https.

### Advertising

Boost posts by turning them into Facebook ads.

### Brand Monitoring

Look up brand information by username across platforms such as Instagram and Facebook.

### Post History

Get history and status of posts sent via Ayrshare, with detailed metadata for each post.

### Content Validation

When sending a post, content goes through a robust set of technical and content checks that return detailed error messages on how to correct any errors. A dedicated validation endpoint is also available to check posts before publishing.

## Events

Ayrshare supports webhooks to receive real-time notifications when specific actions occur. Webhooks are categorized by specific action and are registered at the Primary Profile or User Profile level. Webhooks can optionally be secured with HMAC-SHA256 authentication.

### Scheduled Post Action

Notification when a scheduled post has been processed and published (or failed). Includes the post status, any errors, and individual platform results. A separate sub-event is sent when TikTok completes media processing and makes the post public.

### Social Account Action

Notification when a user's profile links or unlinks a social network. Includes the platform, the type of action (link, unlink, or refresh), and whether it was initiated by the user or the system (e.g., expired token).

### Messages Action

Notifications for direct messaging activity on Facebook and Instagram. Includes three sub-events:

- **New Message**: When a message is sent or received.
- **Message Read**: When a message is read by the recipient.
- **Reaction**: When a reaction (e.g., emoji) is created or deleted on a message.

Requires the Messaging Add-On.

### Batch Action

Notification when a batch operation has completed processing and the output file is available (e.g., batch export of all user profiles). Includes a pre-signed URL to download the result file.

### Feed Action

Notification when a new RSS feed item is found for a registered RSS feed. When this webhook is active, new RSS items will not be automatically posted to social networks, allowing custom handling.

### X Account Activity Action

Real-time notifications for activity on a linked X/Twitter account. Covers a wide range of events including:

- Tweet creation (posts, retweets, replies, mentions, quote tweets)
- Tweet deletion
- Likes (favorites)
- Follows and unfollows
- Blocks and unblocks
- Mutes and unmutes
- Direct messages (sent, received, typing indicators, read receipts)
- User revocation events

Requires Enterprise access and must be explicitly enabled per profile.
