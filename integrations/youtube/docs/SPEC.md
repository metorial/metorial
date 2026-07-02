Now let me get the full list of OAuth scopes:Let me get the exact scope URIs from the .NET SDK reference:Now I have all the information I need. Let me compile the specification.

# Slates Specification for YouTube

## Overview

YouTube is a video-sharing platform owned by Google. Its Data API (v3) allows programmatic access to YouTube resources including videos, channels, playlists, comments, captions, subscriptions, and live streams. The API supports both reading public data and managing authenticated users' YouTube accounts.

## Authentication

YouTube Data API v3 supports two authentication methods:

### 1. API Key

An API key provides access to public data only and does not require user login. It is suitable for reading publicly available video information, channel statistics, or searching for content.

- Obtain an API key from the Google Cloud Console by creating a project and enabling the YouTube Data API v3.
- Every request must either specify an API key (with the `key` parameter) or provide an OAuth 2.0 token.
- Pass the key as a query parameter: `?key=YOUR_API_KEY`

### 2. OAuth 2.0

You must send an authorization token for every insert, update, and delete request. You must also send an authorization token for any request that retrieves the authenticated user's private data.

**Setup:**

- Create a project in the Google Cloud Console and enable the YouTube Data API v3.
- The credentials contain a client ID, client secret, and other information.

**Endpoints:**

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token exchange: `https://oauth2.googleapis.com/token`
- Token revocation: `https://oauth2.googleapis.com/revoke`

**Supported Flows:**
Google APIs support various OAuth 2.0 flows tailored to different application types, such as server-side web apps, JavaScript web apps, mobile and desktop apps, and limited-input devices.

**Important:** While OAuth 2.0 includes a service account flow, the YouTube Data API does not support this method, and using it will result in a NoLinkedYouTubeAccount error.

**Available OAuth 2.0 Scopes:**

| Scope                                                                 | Description                                                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/youtube`                             | Manage your YouTube account                                                                               |
| `https://www.googleapis.com/auth/youtube.readonly`                    | View your YouTube account                                                                                 |
| `https://www.googleapis.com/auth/youtube.force-ssl`                   | See, edit, and permanently delete your YouTube videos, ratings, comments, and captions                    |
| `https://www.googleapis.com/auth/youtube.upload`                      | Manage your YouTube videos                                                                                |
| `https://www.googleapis.com/auth/youtube.channel-memberships.creator` | See a list of your current active channel members, their current level, and when they became a member     |
| `https://www.googleapis.com/auth/youtubepartner`                      | View and manage your assets and associated content on YouTube                                             |
| `https://www.googleapis.com/auth/youtubepartner-channel-audit`        | View private information of your YouTube channel relevant during the audit process with a YouTube partner |

## Features

### Video Management

Use the API to upload videos, manage playlists and subscriptions, update channel settings, and more. You can upload videos (including resumable uploads for large files), update video metadata (title, description, tags, category, privacy status), and delete videos. You can also retrieve detailed video information including statistics (views, likes, comments), content details (duration, definition), and status information.

### Search

Use the API to search for videos matching specific search terms, topics, locations, publication dates, and much more. Search results can include videos, channels, and playlists. Results can be filtered by type, region, language, video duration, definition, and other parameters.

### Channel Management

The API offers a wide array of resources and methods for channels, such as managing channel banners, sections, and memberships. You can retrieve channel information, update channel branding settings, and manage channel sections that organize content on a channel page.

### Playlist Management

Create, update, and delete playlists. Add, remove, and reorder items within playlists. Retrieve playlist metadata and contents. Playlist images can also be managed.

### Comments and Comment Threads

Read, post, update, and delete comments on videos. Manage comment threads (top-level comments and their replies). Moderate comments by setting moderation status or marking as spam.

### Captions

Upload, update, download, and delete caption tracks for videos. Each caption track is associated with a single video. Requires the `youtube.force-ssl` scope.

### Subscriptions

List, create, and delete subscriptions for the authenticated user. A subscription notifies a user when new videos are added to a channel or when another user takes one of several actions on YouTube, such as uploading a video, rating a video, or commenting on a video.

### Activity Feeds

An activity resource contains information about an action that a particular channel, or user, has taken on YouTube. The actions reported in activity feeds include rating a video, sharing a video, marking a video as a favorite, uploading a video, and so forth.

### Live Streaming

Manage live broadcasts and live streams. Create, update, bind, and transition live broadcast events. Manage live chat messages, moderators, and bans during broadcasts. Retrieve Super Chat events.

### Channel Memberships

View a list of current active channel members, their membership level, and join date. View membership levels configured for a channel.

### Thumbnails

Set custom thumbnails for videos.

### Watermarks

Set and unset watermark images that display on a channel's videos.

### Localization and Internationalization

The API also allows you to retrieve different data sets related to the application, such as getting supported regions, supported languages, and reasons for video abuse reports.

### Abuse Reporting

Report videos or comments that contain abusive content. Retrieve a list of valid abuse report reasons.

### Ratings

Rate videos (like/dislike) and retrieve the authenticated user's rating for specific videos.

## Events

The YouTube Data API (v3) supports push notifications via PubSubHubbub, a server-to-server publish/subscribe protocol for Web-accessible resources. Notifications are pushed out to subscribers via HTTP webhooks, which is much more efficient than polling-based solutions.

### Channel Video Activity

Your callback server receives Atom feed notifications when a channel performs any of the following activities:

- Uploads a video
- Updates a video's title
- Updates a video's description

**Configuration:**

- Set the topic URL to `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`, where `CHANNEL_ID` is the YouTube channel ID for which you want to retrieve push notifications.
- Subscribe via the Google PubSubHubbub hub at `https://pubsubhubbub.appspot.com/subscribe` by providing a callback URL, topic URL, and setting the mode to `subscribe`.
- Notifications are delivered as Atom feed XML containing the video ID, channel ID, video title, author, and publish/update timestamps.
- Subscriptions must be periodically renewed (typically every few days) as leases expire.
