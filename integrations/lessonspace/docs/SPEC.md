Now let me fetch the documentation guides for more details on webhooks and authentication.Now I have comprehensive information to write the specification.

# Slates Specification for Lessonspace

## Overview

Lessonspace is a virtual classroom platform that combines video conferencing, digital whiteboards, and document editing for online tutoring and teaching. It provides a REST API for programmatically creating and managing virtual learning spaces, sessions, users, and recordings within an organisation.

## Authentication

Lessonspace uses API keys for authentication. The API key can be found on the Lessonspace dashboard under Settings > Developer.

To authenticate requests, add the `Authorization` header set to `Organisation YOUR_API_KEY`.

**Example:**

```
Authorization: Organisation sk_live_abc123...
```

The base URL for all API requests is `https://api.thelessonspace.com/v2/`.

There are no OAuth flows or scopes. The API key grants full access to the organisation's resources.

## Features

### Space Management

Create custom branded spaces programmatically and embed them into your application with configurable functionality. Spaces are created via a "Launch" endpoint which either creates a new space or returns an existing one based on a provided `id`. The same endpoint generates per-user join URLs.

- Spaces can be configured with custom names, tags, region preferences, and feature toggles.
- Spaces can be embedded in an iframe as a white-labeled solution.
- Supports external authentication flows (redirect-based) for controlling who can access an embedded space.
- Spaces can be configured with time-based access restrictions (`not_before`, `not_after`).
- Guest access can be enabled or disabled per space.

### User & Leader Mode

Users joining a space can be configured with a name, email, profile picture, role (leader or standard), and custom JWT parameters. A user with leader mode enabled is given certain privileges over standard users, including access to certain features and control over certain user actions.

- Leaders can force all participants to follow their view, mute/unmute other users, enable read-only mode, and ban users.
- Users can join in ghost (spectator) mode without camera or microphone, invisible to other participants.
- Single-use and session-limited tokens can restrict how and when join links are used.

### Session Management

Sessions represent the period during which users are connected to a space. The session ID refers to the upcoming session and only changes once a session has started and ended; subsequent calls then generate a new session ID.

- List, retrieve, and update sessions for an organisation or specific space.
- Filter sessions by time range, duration, user, space, tags, and more.
- Update session names and recording access policies.

### Session Recordings

A recording is not just a video — users are taken to the space as a playback user, where a series of captured events are synced with recorded audio/video. Users can download resources, move freely within the space, and switch to different users' perspectives.

- Recording of audio/video and/or content can be enabled per space launch.
- Recording access policies control who can view recordings (participant, admin, teacher, student).
- Recordings can be embedded in iframes.
- Retrieve recording URLs via the API.

### Session Transcriptions & Summaries

Transcriptions and AI-generated lesson summaries can be enabled when launching a space.

- Transcriptions are generated after a session ends and can be retrieved via the API.
- Summaries provide an AI-generated overview of the lesson content.
- Both must be opted into at launch time via `transcribe` and `summarise` boolean flags.

### Organisation User Management

List users belonging to an organisation, filtered by role (teacher, student, admin), space, or session. Users can be removed from an organisation.

### Space Customisation

Spaces support extensive per-user feature toggles and theming options.

- Enable or disable arbitrary features (e.g., chat, whiteboard tools) on a per-user basis — two users in the same space can have different feature sets.
- Control UI theme elements per user.
- Set video layout mode (grid, sidebar, floating).
- Set locale/language (English, French, Italian, Polish).
- Provide a custom invite URL and custom resource library URL.
- Set default virtual camera backgrounds.

## Events

The Lessonspace API provides various webhooks to get information about spaces in real-time. Webhooks are set up by specifying them in the body of the POST request to the Launch endpoint. Any webhooks sent on subsequent calls for the same space will fully overwrite existing ones (not merged). Webhooks can be removed by passing a null value or empty string, or left as-is by not sending a new webhooks property.

Webhook payloads include an `x-webhook-signature` header for verification, calculated as an HMAC-SHA256 of the payload using the space secret as the signing key.

### Session Events

- **Session Start**: Triggered when a space registers its first user join.
- **Session End**: Triggered when a session ends.
- **Session Idle**: Triggered when a session becomes idle.

### User Events

- **User Join**: Triggered when a user joins a space.
- **User Leave**: Triggered when a user leaves a space, which can occur when they close their browser tab, click the End Session button, or are otherwise disconnected.
- **User Idle**: Triggered when a user becomes idle.

### Chat Events

- **Chat Message**: Triggered when a chat message is sent in a space.

### Co-browser Events

- **Co-browser Start**: Triggered when a co-browsing session begins.
- **Co-browser Stop**: Triggered when a co-browsing session stops.

### Transcription Events

- **Transcription Finish**: Triggered when a session transcription has finished processing.

### Summary Events

- **Summary Finish**: Triggered when an AI-generated lesson summary has finished processing.
