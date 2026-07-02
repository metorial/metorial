The docs page is a shell page that likely loads via JavaScript. Let me check the actual API reference.Now I have enough information to write the specification. The Zapier triggers page gave me a comprehensive list of webhook event types.

# Slates Specification for Typefully

## Overview

Typefully is a social media management platform for creating, scheduling, and publishing content across X (Twitter), LinkedIn, Threads, Bluesky, and Mastodon. It provides a writing editor, scheduling queue, analytics, and AI-powered content optimization tools. The API allows programmatic content management across all supported platforms.

## Authentication

The API uses API keys for authentication. You can create and manage API keys from Settings → API in Typefully.

For the current v2 API, include the API key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

Note: The legacy v1 API used a different header format (`X-API-KEY: Bearer YOUR_KEY`), but v2 is the recommended version.

No OAuth flow is required. There are no scopes — an API key grants full access to the associated Typefully account.

## Features

### Multi-Platform Draft Creation

Create draft posts for one or more platforms (X, LinkedIn, Threads, Bluesky, Mastodon) in a single API call. In v2, you have full control over thread structure — instead of relying on auto-splitting, explicitly define each post in the posts array. Each platform can have its own tailored content within the same draft. Drafts are scoped to a "Social Set," which represents a group of connected platform accounts.

### Scheduling and Publishing

Drafts can be published immediately, scheduled for a specific date/time, or queued into the next available time slot. You can add an existing draft to the publishing queue in the next available slot to maintain consistent posting without specifying exact times.

### Media Uploads

Upload images, videos, GIFs, and PDFs to include in your posts. Media is uploaded separately and returns a media ID, which can then be attached to posts within a draft. You can check media processing status (processing, ready, or failed) before attaching.

### Tags Management

Organize your content with tags for better workflow management. You can list existing tags, create new tags, and assign tags to drafts at creation time. Tags can be used for content categorization and approval workflows.

### Social Sets

API v2 introduces Social Sets — groups of connected platform accounts. All draft operations are scoped under a social set and require a social_set_id. You can list available social sets and retrieve details about their connected platforms.

### Draft Management

Retrieve, list, and filter drafts by status (draft, scheduled, published) or other criteria. Manage tags and filter by status or analytics.

### Notifications (v1 only)

Notification endpoints are only available in v1. If you need notifications, continue using the v1 `/api/v1/notifications/` endpoint. However, it will be deprecated on 15th June 2026.

## Events

Typefully supports webhooks for real-time event notifications. Configure webhook URLs in Settings → API by clicking + Add webhook.

### Draft Created

Fires when a new draft is created in Typefully. Can be filtered by Social Set.

### Draft Published

Fires when a draft goes live on social platforms. Can be filtered by Social Set.

### Draft Scheduled

Fires when a draft is scheduled for future publication. Can be filtered by Social Set.

### Draft Status Changed

Fires when a draft's status changes (draft → scheduled, scheduled → published, etc.). Can be filtered by Social Set.

### Draft Tags Changed

Fires when tags are added to or removed from a draft. Can be filtered by Social Set.

### Draft Deleted

Fires when a draft is deleted from Typefully. Can be filtered by Social Set.
