# Slates Specification for Vimeo

## Overview

Vimeo is a video hosting and sharing platform that provides tools for uploading, managing, embedding, and streaming video content. Its API allows programmatic access to video management, user account data, showcases, folders, channels, and live streaming capabilities. Vimeo also offers a separate OTT (over-the-top) API for subscription-based video services.

## Authentication

Vimeo uses **OAuth 2.0** as its authentication framework. All API requests require an access token.

### Registering an Application

Registering an application inside Vimeo's Developer Portal generates a unique client ID and client secret, which form the backbone for token exchanges. Register your app at `https://developer.vimeo.com/api/apps`.

You must configure a **Redirect URI** in your application settings, which is where users are redirected after authorization.

### Authentication Methods

1. **Authorization Code Grant (OAuth 2.0):** This mechanism allows a Vimeo user to grant permission to your app so that it can access private, user-specific content on their behalf.
   - **Authorization endpoint:** `https://api.vimeo.com/oauth/authorize`
   - Set `response_type` to `code`, allowing for the exchange of an authorization code.
   - Use the authorization code to request an access token from the token endpoint: `https://api.vimeo.com/oauth/access_token`. Send a POST request containing your client ID, client secret, the code, and the redirect URI to receive a token.
   - Access tokens expire—typically after one hour—and your code needs to seamlessly refresh them using the refresh token provided during the initial authorization.

2. **Client Credentials Grant:** This mechanism allows your application to access publicly accessible content on Vimeo. No user context is involved; the token represents the application itself.

3. **Personal Access Token (PAT):** A Personal Access Token offers a direct, straightforward method to gain sustained authorization without juggling OAuth flows. Unlike temporary session tokens, PATs behave like long-lived keys tied explicitly to an individual account, granting granular permission scopes. These can be generated directly from the Vimeo app page in the developer portal.

### Scopes

Vimeo employs OAuth scopes that define exactly what actions your token can perform. Available scopes include:

- **`public`** – Access to public video metadata and user information.
- **`private`** – Access to private user data and videos.
- **`upload`** – Ability to upload videos.
- **`edit`** – Ability to edit video metadata and settings.
- **`delete`** – Ability to delete videos.
- **`interact`** – Allows not only liking and commenting but also following users.
- **`purchased`** – Access to purchased content.
- **`create`** – Ability to create resources (albums, channels, etc.).
- **`video_files`** – Access to video file links (may require a Pro or higher plan).

For uploading, you need an access token with the `upload` and `edit` scopes. Also note that for an app to be able to upload videos to Vimeo, you need to switch on the upload access—this option isn't enabled by default.

### Token Usage

Include the access token as a Bearer token in the `Authorization` header:

```
Authorization: Bearer {access_token}
```

## Features

### Video Management

The Vimeo API allows developers to access and interact with Vimeo's video platform programmatically. By using the API, developers can upload, manage, and customize videos, as well as access data related to their Vimeo account and videos.

- Upload videos (requires requesting upload access for your app).
- Edit video metadata (title, description, tags, etc.).
- Delete videos.
- Update video metadata, set privacy controls, and manage video settings.
- Manage thumbnails and text tracks (subtitles/captions).
- Search for videos by keywords, with filtering by category, tag, and sorting by relevance or date.

### User and Account Management

Retrieve and update user profile information, manage followers/following relationships, and access user-specific data such as liked videos, watch history, and purchased content.

### Showcases and Folders

The API Reference includes features like Showcases, Folders, etc., with endpoint documentation for actions like adding videos to a Showcase or getting videos in a Folder.

- Create, update, and delete showcases (curated video collections).
- Organize videos into folders for internal management.
- Manage showcase privacy and branding settings.

### Channels and Groups

Channels arrange videos based on their theme or some other criteria and group them into channels. Groups are places like communities where members can share, discuss, and collaborate on videos.

- Create and manage channels and groups.
- Add or remove videos from channels.

### Embedding and Player Customization

It's possible to modify the default Vimeo video player in terms of features like autoplay, looping, playback events, and even player on-screen dimensions and controls colors.

- Retrieve embed codes via oEmbed.
- Configure embed parameters for branding and playback behavior.
- The Player SDK (JavaScript) provides additional programmatic control over embedded players.

### Live Streaming

The Live API is a part of the Vimeo API that enables interaction with and control of live events on Vimeo. Access to the Live API is only available to Vimeo Enterprise members.

- Create and manage live events (one-time and recurring).
- Configure streaming settings and retrieve RTMP endpoints.
- Access archived live clips after events conclude.

### Categories

Categories define a set of videos that belong to a specific genre. You can browse and retrieve videos by category.

## Events

Vimeo supports **webhooks** for receiving real-time notifications about events on the platform. Vimeo offers notifications for almost 40 different events related to videos, channels, and albums.

Webhooks are created programmatically via the API by posting to `https://api.vimeo.com/me/webhooks` with a callback URL and a list of event types to subscribe to. Incoming requests can be verified using a shared secret to authenticate notifications (signature validation).

### Video Events

Notifications related to video lifecycle and interactions, such as:

- Upload completion (`video.upload.complete`)
- Video playback (`video.play`)
- Video status changes

These events allow you to trigger workflows when videos are uploaded, processed, played, or modified.

### Channel and Album Events

Notifications related to changes in channels and albums/showcases, such as videos being added or removed.

### Account/User Events

Notifications for user-level activities such as likes, follows, and other interactions on the platform.
