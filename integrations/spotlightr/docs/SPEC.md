Now let me get more details on the REST API endpoints:Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Spotlightr

## Overview

Spotlightr (formerly vooPlayer) is a video hosting and marketing platform designed for course creators and e-learning professionals. It provides video hosting, customizable branded players, content protection with HLS encryption, video analytics, lead capture gates, and integrations with marketing tools and LMS platforms.

## Authentication

Spotlightr uses **API Key** authentication for its REST API.

- **API Key parameter**: `vooKey`
- **How to obtain**: Navigate to **Settings > Integrations & APIs > Spotlightr API Key > Get API key** within the Spotlightr application.
- **Usage**: The API key is passed as a query parameter (`vooKey`) on all REST API requests to `https://api.spotlightr.com/api/`.

Example request:

```
GET https://api.spotlightr.com/api/videos?vooKey=YOUR_API_KEY
```

There is no OAuth2 flow or additional scopes. A single API key provides access to all REST API capabilities associated with the account.

## Features

### Video Management

Create, list, update, and delete videos in your account. Videos can be created by uploading a file directly or by linking an external URL (YouTube, Google Drive, Vimeo, etc.). You can also set or copy player settings from an existing video when creating a new one. When both a URL and file are provided, the URL takes priority.

- **Parameters**: `name` (video title), `URL` (external link) or `file` (uploaded video file), `playerSettings` (optional video ID to copy settings from).
- Player settings can only be copied from videos owned by the authenticated account.

### Video Analytics

Retrieve analytics data for individual videos, including loads, plays, play rate, watch percentage, completion rate, and shares. You can also retrieve individual video view session data.

### Top Videos

Retrieve a ranked list of top-performing videos from your account based on engagement metrics.

### Video Source Management

Update the source of an existing video without changing its embed code or watch page URL. This allows swapping out video content while preserving analytics and existing embeds.

### Watch Page & Embed Customization

Customize the URL of the watch page or the source of the embedded iframe with added functionality via URL parameters. Every video, playlist, quiz, and gallery has its own customizable landing page.

### JavaScript Player API

A client-side JavaScript API allows controlling the embedded video player from the host web page. This includes programmatic play/pause, volume control, caption toggling, overlay visibility, lock visibility, retrieving playback duration/time, and listening to player events (e.g., pause, time-based triggers). Requires advanced embed code to be enabled.

- **Methods**: `play`, `pause`, `captions`, `volume`, `showOverlays`, `showLocks`, `getDuration`, `getTime`, `setRemainingTime`, `sendVideoAnalytics`.
- **Events**: `onPause`, `getTime` (at specific time ranges), `vooPlayerReady` (fired when player is loaded).

## Events

Spotlightr supports **webhooks** for receiving event data at a custom endpoint.

### Webhook Integration

Users can configure a custom webhook endpoint to receive data when specific video interactions occur. Webhooks are set up under **App Settings > Integrations > Add Integration > Webhook**, where you provide a title and endpoint URL.

### Optin / Lead Capture Events

When a viewer submits their information through an email gate or other lead capture form on a video, the captured data is sent to the configured webhook endpoint. This is useful for syncing lead data with external CRMs or databases.

### Video Watch Notifications

Notifications can be triggered when someone watches a video. This feature is configured per-video under **Settings > Advanced Options > Watched Email Notification**, and can be routed to a webhook endpoint (as well as email or Google Analytics). The webhook receives viewing data for the watched video.
