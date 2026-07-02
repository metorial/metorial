Now let me get the full list of scopes:# Slates Specification for Spotify

## Overview

Spotify is a music streaming service that provides a Web API for accessing its music catalog, managing playlists, controlling playback, and retrieving user data. The Spotify Web API enables the creation of applications that can interact with Spotify's streaming service, such as retrieving content metadata, creating and managing playlists, or controlling playback. A Spotify Premium account is required to use the Web API.

## Authentication

Spotify implements the OAuth 2.0 authorization framework for granting applications access to Spotify data and features. The authorization process requires valid client credentials: a client ID and a client secret, which can be obtained by registering an app in the Spotify Developer Dashboard.

Spotify supports the following OAuth 2.0 flows:

### 1. Authorization Code Flow

The most comprehensive and commonly used flow, suitable for applications that have a server-side component and can securely store client secrets. This flow provides both an access token and a refresh token.

- **Authorization endpoint:** `https://accounts.spotify.com/authorize` (GET)
- **Token endpoint:** `https://accounts.spotify.com/api/token` (POST)
- **Required parameters:** `client_id`, `response_type=code`, `redirect_uri`, and optionally `scope` and `state`
- Upon successful authentication, Spotify responds with an access token (short-lived) and a refresh token (long-lived) used to obtain new access tokens without re-authentication.

### 2. Authorization Code Flow with PKCE

The recommended authorization flow for mobile apps, single page web apps, or any application where the client secret can't be safely stored. This technique allows third-party apps to securely fetch a refreshable access token without a client secret.

- Same endpoints as the standard Authorization Code Flow
- Additional parameters: `code_challenge` and `code_challenge_method=S256`
- Does not require the client secret for the token exchange; uses a code verifier instead

### 3. Client Credentials Flow

Used in server-to-server authentication. Since this flow does not include authorization, only endpoints that do not access user information can be accessed.

- **Token endpoint:** `https://accounts.spotify.com/api/token` (POST)
- Requires `client_id` and `client_secret` sent via Basic Auth header
- No refresh token is issued; request a new token when it expires

### Token Details

Access tokens are valid for 1 hour (3600 seconds). After that time, the token expires and a new one must be requested. Access tokens are sent as a Bearer token in the `Authorization` header.

### Scopes

Scopes enable your application to access specific functionality (e.g., read a playlist, modify your library or just streaming) on behalf of a user. The set of scopes you set during authorization determines the access permissions that the user is asked to grant. Scopes are passed as a space-separated list during the authorization request.

Available scope categories:

- **Images:** `ugc-image-upload`
- **Spotify Connect:** `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`
- **Playback:** `app-remote-control`, `streaming`
- **Playlists:** `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-private`, `playlist-modify-public`
- **Follow:** `user-follow-modify`, `user-follow-read`
- **Listening History:** `user-read-playback-position`, `user-top-read`, `user-read-recently-played`
- **Library:** `user-library-modify`, `user-library-read`
- **Users:** `user-read-email`, `user-read-private`

Note: Spotify has ended support for the implicit grant flow, HTTP redirect URIs, and localhost aliases in their OAuth system. Production apps must use HTTPS redirect URIs.

## Features

### Music Catalog Browsing

Access Spotify's extensive music catalog including metadata for artists, albums, tracks, audiobooks, shows (podcasts), and episodes. Retrieve detailed information including names, descriptions, images, release dates, and popularity metrics. Browse categories and discover new releases and featured playlists.

- Content can be filtered by market/country
- Some catalog endpoints like Related Artists, Recommendations, and Audio Features are restricted for new applications (existing apps with extended quota mode access are unaffected)

### Search

Search across Spotify's catalog for tracks, artists, albums, playlists, shows, and episodes using keyword queries. Results can be filtered by content type, market, and other parameters.

### Playlist Management

Create, read, update, and delete playlists. Add or remove items (tracks and episodes), reorder items, change playlist details (name, description, public/private status), and upload custom cover images.

- Playlists can be public, private, or collaborative
- Requires appropriate playlist scopes for read/write access to private and collaborative playlists

### Playback Control (Player API)

Control Spotify playback from any internet-connected device. Start, pause, resume, skip tracks, seek to a position, set volume, toggle shuffle, and set repeat mode. Transfer playback between devices and add items to the playback queue.

- Most playback commands require Spotify Premium.
- Can target specific devices using a device ID
- Retrieve the currently playing track, playback state, available devices, and the user's queue

### User Library Management

Save and remove albums, tracks, episodes, shows, and audiobooks to/from the user's personal library ("Your Music"). Check whether specific items are already saved.

### User Profile & Personalization

Retrieve the current user's profile (display name, email, subscription type, country) or other users' public profiles. Access the user's top artists and tracks over different time ranges, and retrieve recently played tracks.

- Top items can be queried for `short_term`, `medium_term`, or `long_term` time ranges

### Follow Management

Follow or unfollow artists, users, and playlists. Check whether the current user follows specific artists, users, or playlists. Retrieve the list of artists the user follows.

### Audio Features & Analysis

Retrieve audio features for tracks (danceability, energy, tempo, acousticness, valence, etc.) and detailed audio analysis data.

- Audio Features and Audio Analysis endpoints are restricted for new applications without extended quota mode access

## Events

Spotify doesn't have a direct webhook registration endpoint. The Spotify Web API does not provide native webhooks or purpose-built event subscription mechanisms. There is no way to subscribe to real-time notifications for changes such as playlist modifications, new tracks played, or library updates through the API itself.

The provider does not support events.
