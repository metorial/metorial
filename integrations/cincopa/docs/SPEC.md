# Slates Specification for Cincopa

## Overview

Cincopa is a multimedia hosting and management platform that supports video, audio, images, and other digital media. It provides tools for organizing media into galleries, embedding content, collecting user-generated content, live streaming, lead generation, and analytics. The platform offers a REST API (V2) for programmatic access to assets, galleries, portals, uploads, live streaming, and webhooks.

## Authentication

Cincopa REST API V2 uses a simple API token (`api_token`) for authentication. The token can be created and deleted per app, with configurable permission levels according to the needed level and exposure level.

**How to obtain an API token:**

To use any APIs provided by Cincopa, you will need to validate your Cincopa account using the API token generated through your account. To create API tokens, click on the profile icon on the top right corner and then select Account Dashboard. Select the access permissions that you want to give the API Token; you will be able to check the list of actions that you can perform with the new key.

**Usage:**

The `api_token` is passed as a query parameter on every API request. For example:

```
https://api.cincopa.com/v2/ping.json?api_token=YOUR_API_TOKEN
```

**Permission levels:**

Permissions follow a pattern-based system, e.g., `|asset.*|gallery.*|portal.*|webhook.*|live.*|token.*|account.read|`. Tokens can be configured with read-only or read-write permissions depending on the use case.

- In a server-to-server scenario where the api_token is not exposed to the public, the permissions level can allow write and delete.
- In a client-to-server scenario like a JavaScript request from a public web page, the permission level should be set to read-only.

**Temporary tokens:**

Cincopa provides a method to get a temporary token for front-end scenarios. For example, if you've built a UI to update a gallery or asset via JavaScript, the temporary token provides controlled access with usage limits. You must first configure specific permissions (e.g., `gallery.update` or `asset.update`) for the temporary token. The temporary token supports a configurable time-to-live in seconds, after which it expires. Leave empty for tokens that never expire.

## Features

### Gallery Management

A comprehensive suite of methods for managing media galleries, allowing developers to programmatically create, manage, and customize multimedia galleries. You can create galleries, update metadata (title, description, custom properties), delete galleries, add/remove media items, list galleries, retrieve gallery items, and designate a master (featured) media asset within a gallery.

### Asset Management

A comprehensive suite of methods for managing assets within your account, enabling developers to efficiently upload, organize, modify, and retrieve digital assets. Features include listing and searching assets (by text, reference ID, or type such as video, image, audio), setting metadata, tagging assets, deleting assets, and resyncing assets when processing failures occur. Asset types include video, image, audio, and other. If not specified, all types are returned by default.

### Media Upload

The Upload API allows uploading media files to Cincopa galleries. It offers two primary methods: an embeddable iFrame for direct user uploads with drag-and-drop, metadata editing, and reordering; and a secure token-based system for controlled access. Additionally, you can upload assets via HTTP POST to a generated upload URL, upload from a remote URL (with status tracking and abort capability), or upload via email to a unique email address.

### Portal Management

Portals are customizable landing pages, video hubs, or share pages. You can create, update, rename, deactivate, and remove portals, as well as list all existing portals and check their availability/status.

### Live Streaming

The API supports managing live video streams, including creating, starting, stopping, resetting, deleting, and listing live streams.

### User-Generated Content (UGC)

Cincopa UGC is a set of frontend JavaScript libraries to upload and record content directly from your web/mobile app. Users can share content with you by uploading files or recording their screen or webcam. The uploaded file or recording is added directly to your Cincopa account and you get notified using a webhook.

### Analytics

The Cincopa Video Analytics dashboard shows aggregate video stats within a selected timeframe. The video analytics data is presented in a graph and can be exported. Analytics include per-asset and per-gallery views, viewer heatmaps showing second-by-second engagement, and contextual information about where and when content was watched.

### Lead Generation

Cincopa supports adding lead generation forms to videos to capture viewer information. Lead events can be tracked and processed through webhooks.

## Events

Cincopa webhooks enable real-time event notifications. You can monitor various events, such as uploads, updates, and deletions. Webhook setup requires selecting events, defining a callback URL, and securing the connection.

Supported event namespaces include: `asset.deleted`, `asset.updated`, `asset.uploaded`, `gallery.created`, `gallery.deleted`, `gallery.synced`, `gallery.updated`, `account.settings`, `account.traffic_usage`, `lead.created`. You can subscribe to individual events or use wildcard namespaces. Available namespaces include `gallery.*`, `asset.*`, `account.*`, `analytics.*`, `leads.*`.

### Asset Events

Get notified when assets are added, modified, or deleted. Specific events: `asset.uploaded`, `asset.updated`, `asset.deleted`.

### Gallery Events

Track gallery creation, updates, and changes. Specific events: `gallery.created`, `gallery.updated`, `gallery.deleted`, `gallery.synced` (fires when a gallery and all its assets are stored and ready for CDN delivery).

### Account Events

Monitor account-level activities and analytics. Specific events: `account.settings`, `account.traffic_usage`.

### Lead Events

Capture and process lead generation events. Specific event: `lead.created`. If you are planning to use Cincopa lead generation forms you must select a Lead event.

### Analytics Events

Analytics events are triggered on new form registration. Available via the `analytics.*` namespace.
