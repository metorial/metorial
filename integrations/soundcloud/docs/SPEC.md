# Slates Specification for SoundCloud

## Overview

SoundCloud is an audio streaming and sharing platform for musicians, podcasters, and creators. Its API provides access to resources such as tracks, playlists, users, and comments, enabling applications to upload, stream, search, and manage audio content programmatically.

## Authentication

SoundCloud authentication uses the OAuth 2.1 draft. PKCE is now required in order to securely exchange the auth code. To begin, you must register an application on the SoundCloud Developers portal to obtain a `client_id` and `client_secret`.

Two grant types are supported:

### Authorization Code Flow (with PKCE)

Used when your application needs to perform actions on behalf of a user (e.g., uploading tracks, liking, commenting).

- **Authorization URL:** `https://soundcloud.com/connect`
- **Token URL:** `https://secure.soundcloud.com/oauth/token`
- Required parameters: `client_id` (obtained during app registration) and `redirect_uri` (provided during app registration).
- A PKCE `code_challenge` is required.
- A `state` parameter (random string) should be used for CSRF protection.
- The token response includes `access_token`, `refresh_token`, `expires_in`, and `scope`.
- Tokens can expire and need to be refreshed.

### Client Credentials Flow

Used for server-side integrations that only need access to public resources without acting on behalf of a user.

- There is no need to go through the connect flow; you pass along the `client_id` and `client_secret` to authenticate and get a token.
- For the client credentials grant type, only basic header client authentication is supported (Base64-encoded `client_id:client_secret`).

### General Notes

- All SoundCloud resources require an `Authorization` header; requests without it will be rejected with a 401 error. The header format is: `Authorization: OAuth ACCESS_TOKEN`.
- Currently, all clients are treated as confidential rather than public, meaning a secret is required to obtain a token.

## Features

### Track Management

Tracks are core to SoundCloud. The API allows uploading, managing, and sharing tracks. Apps can upload audio files to a user's account and manage metadata including tags. Supported formats include AIFF, WAVE, FLAC, OGG, MP2, MP3, AAC, AMR, and WMA.

- Track metadata can be updated after upload, including artwork.
- Tracks can be deleted by the owner.
- Tracks have three access levels: `playable` (fully streamable), `preview` (preview only), and `blocked` (metadata only).

### Audio Streaming

The API provides access to a track's stream URL for use in custom audio players. A GET request to the stream resource returns available transcodings to choose from.

- Public tracks can be streamed without a user session; private tracks require an authorized session and a secret token.
- Proper attribution to SoundCloud is required when streaming off-platform.

### Playlist Management

Playlists (also called "sets") can be created, retrieved, updated, and deleted. Tracks can be added to or removed from playlists. Playlists can be marked as albums.

### User Profiles

Once authorized, you can access information about the authenticated user via the `/me` endpoint. You can also retrieve public profile information for any user, including their tracks, playlists, followers, and followings.

### Social Interactions

The API supports social features including following other users and liking tracks or playlists. Tracks from followed users appear in the activity feed.

- Users interact primarily through comments on tracks. Comments can be timed (tied to a specific point in the track). Commenting can be disabled by the track creator.
- Tracks and playlists can be reposted to a user's profile.

### Search and Discovery

The API allows searching for tracks, playlists, and users by query. Search results can be filtered by various parameters including access level (playable, preview, blocked).

### URL Resolution

SoundCloud URLs (e.g., `soundcloud.com/user/track-name`) can be resolved to their corresponding API resource representations, which is useful for fetching data from user-facing links.

### Embedding (oEmbed)

Given a track or playlist URL, you can retrieve embed information via the oEmbed endpoint to embed a SoundCloud player on external websites. Configurable options include max width, max height, and auto-play.

## Events

The provider does not support events. SoundCloud's API does not offer webhooks or any built-in event subscription mechanism for receiving real-time notifications about changes to resources.
