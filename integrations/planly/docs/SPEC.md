Based on my research, the Planly API documentation does not mention any webhook or event subscription functionality. Now I have all the information needed to write the specification.

# Slates Specification for Planly

## Overview

Planly is a social media management platform that allows users to schedule and auto-publish posts across multiple social networks including Instagram, Facebook, Twitter/X, LinkedIn, Pinterest, TikTok, YouTube, Threads, Mastodon, and Bluesky. It also provides AI-powered content generation, media management, team collaboration, and social media analytics.

## Authentication

Planly uses API keys to allow access to the API. You can get your Planly API key from Settings > Security.

Planly expects the API key to be included in all API requests in an `Authorization` header using the Bearer scheme:

```
Authorization: Bearer api_key
```

The base URL for all API requests is `https://app.planly.com/api/`.

No OAuth2 or other authentication methods are documented. There are no scopes or additional credentials required beyond the API key.

## Features

### Team Management

Create, list, edit, and delete teams. You can use the API to manage your channels and much more. Teams are the top-level organizational unit in Planly. You can also list team members, transfer team ownership, and remove users from a team. Most API operations require a `teamId` parameter, so teams are central to all workflows.

### Channel Management

List and delete connected social media channels within a team. Planly supports Instagram, Threads, Facebook, LinkedIn, Pinterest, TikTok, YouTube, Bluesky, Twitter (X), and Mastodon. Channels represent individual social media accounts connected to a team. Note that connecting new channels (OAuth flows with social networks) must be done through the Planly web interface; the API only allows listing and deleting existing channels.

### Post Scheduling

Schedule posts to one or more social media channels with platform-specific options. Posts can be scheduled for a future date/time or published immediately. Each social network supports specific options:

- **Facebook**: Post type (Reels, Story, default), first comment, link embedding, location tagging.
- **Instagram**: Post type (Post, Story; Reels auto-detected), first comment, location tagging, share to feed for Reels, up to 3 collaborators.
- **LinkedIn**: First comment, link embedding.
- **Twitter/X**: Thread chains with multiple tweets, each with their own content and media.
- **TikTok**: Privacy level (required), Duet/Stitch/comment controls, branded content disclosure.
- **YouTube**: Title, privacy status, category, made-for-kids declaration, subscriber notification, embedding, first comment.
- **Pinterest**: Board selection (required for publishing), title, link.
- **Mastodon**: Visibility level, polls (up to 4 options with configurable expiration), first comment.
- **Threads**: Link embedding.

### Schedule Groups

Group multiple schedules together for coordinated publishing. Schedule groups allow publishing to multiple channels at the same time. Groups can be created as drafts or as scheduled. You can list, update, and delete schedule groups, with filtering by channel, status, social network, media type, and date range.

### Media Management

Upload, import, list, and delete media files. The upload process is two-step: first request a pre-signed upload URL, then confirm the upload after the file has been transferred. Media can also be imported directly from a URL. Supported media types include `video/mp4`, `image/png`, `image/jpeg`, and `image/webp`. Uploaded media is associated with a team and can be attached to scheduled posts.

### AI Content Generation

Generate text content using AI. You can send a prompt and specify how many result variations to generate. AI usage is credit-based, and you can check available credits per team.

### Pinterest Board Listing

Retrieve the list of Pinterest boards for a connected Pinterest channel. This is needed when scheduling Pinterest posts, as a board ID is required for publishing.

## Events

The provider does not support events. The Planly API documentation does not include any webhook, event subscription, or callback mechanisms.
