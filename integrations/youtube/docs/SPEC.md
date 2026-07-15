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
| `https://www.googleapis.com/auth/userinfo.email`                       | Read the Google Account email used to identify the authorized connection                                 |
| `https://www.googleapis.com/auth/userinfo.profile`                     | Read the basic Google Account profile used to identify the authorized connection                         |
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

`upload_video` implements `videos.insert` with Google's resumable upload protocol. It accepts title, description, tags, category, and privacy metadata plus exactly one media source:

- `contentBase64` is capped at 6 MiB of decoded data because base64 expands model and tool payloads. It is intended for small test clips only.
- `sourceUrl` is the practical large-file path, capped at an operational limit of 2 GiB (2,147,483,648 bytes). The limit is enforced against the declared content length before the upload session starts and against the byte ranges actually streamed. It must use HTTPS, contain no embedded credentials, resolve only to public addresses, survive redirect revalidation (maximum three redirects), and support uncompressed HTTP byte ranges with stable length and media type. IPv6 answers are restricted to public unicast (2000::/3) and explicitly exclude the IPv4-embedding transition prefixes 6to4 (`2002::/16`), Teredo (`2001::/32`), NAT64 (`64:ff9b::/96`), and the documentation range (`2001:db8::/32`). DNS results are pinned per request, and a strong ETag is enforced across chunks when the source provides one. The integration reads and uploads 8 MiB chunks, honors bounded `Retry-After` delays, and queries the resumable session after retryable network or Google `5xx` failures before resending bytes. A `308` response without a `Range` header is treated per the resumable protocol as "no bytes committed" and restarts the transfer from byte 0 under the same bounded retry budget.

YouTube itself accepts `video/*` or `application/octet-stream` media up to 256 GB, but this integration limits `sourceUrl` uploads to 2 GiB because streaming larger media through sequential 8 MiB chunks cannot complete within a tool-invocation window. This integration defaults new uploads to `private` and disables subscriber notifications unless explicitly requested. YouTube also forces uploads from unverified API projects created after July 28, 2020 to private viewing until the project passes an audit. Uploads require OAuth; API-key authentication cannot upload media.

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

`download_caption` calls `captions.download` and returns the binary response as a Slate attachment, with only caption ID, requested format/language, MIME type, byte size, file name, and attachment count in structured output. It supports original-format downloads or `sbv`, `scc`, `srt`, `ttml`, and `vtt` conversion plus optional machine translation to a BCP-47 language tag (e.g. `en`, `zh-Hans`, `pt-BR`). The suggested file name uses the requested format as its extension; when no format is requested the extension is derived from the response content type (`text/vtt` → `.vtt`, `application/x-subrip`/`text/srt` → `.srt`, `application/ttml+xml` → `.ttml`, `text/sbv`/`text/x-sbv` → `.sbv`), falling back to `.txt` for unknown types. Google requires the authenticated user to have permission to edit the video's caption track; public captions that the user does not own cannot be downloaded through this API. The method requires `youtube.force-ssl` or `youtubepartner`.

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

`set_thumbnail` calls the media upload endpoint for `thumbnails.set`. It accepts base64 JPEG or PNG content with a matching file signature up to YouTube's 2 MB limit and requires ownership of the video plus a channel that is eligible to upload custom thumbnails. The response normalizes YouTube's nested `default`, `medium`, `high`, `standard`, and `maxres` resources into named thumbnail variants.

### Watermarks

Set and unset watermark images that display on a channel's videos.

### Localization and Internationalization

The API also allows you to retrieve different data sets related to the application, such as getting supported regions, supported languages, and reasons for video abuse reports.

### Abuse Reporting

Report videos or comments that contain abusive content. Retrieve a list of valid abuse report reasons.

### Ratings

Rate videos (like/dislike) and retrieve the authenticated user's rating for specific videos.

`get_video_rating` exposes `videos.getRating` as a dedicated read-only tool and accepts one or more video IDs. Returned values are `like`, `dislike`, `none`, or `unspecified`. It requires authenticated-user OAuth access; public API keys do not have a user rating identity.

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
