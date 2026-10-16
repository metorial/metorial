# Planly API Specification

API source: [Planly API Reference](https://docs.planly.com/), checked 2026-10-15.

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

Create, list, retrieve, edit, and delete teams. Team details expose permissions and plan limits as well as member and connected/disconnected channel counts. You can also list team members, transfer team ownership, and remove users from a team. Discover team IDs with `list_teams` before scoped operations.

### Channel Management

List and delete connected social media channels within a team. Planly supports Instagram, Threads, Facebook, LinkedIn, Pinterest, TikTok, YouTube, Bluesky, Twitter (X), and Mastodon. Channels represent individual social media accounts connected to a team. Note that connecting new channels (OAuth flows with social networks) must be done through the Planly web interface; the API only allows listing and deleting existing channels.

### Post Scheduling

Schedule posts to one or more social media channels with platform-specific options. Posts can be scheduled for a future date/time or published immediately. Each social network supports specific options:

Use `channelPlatformOptions` for different social networks in one call. Each channel receives its own network options. Global `platformOptions` accepts one network and applies to channels without a per-channel override. Twitter thread media IDs are translated to the provider's `id` field. Created schedule groups and schedules are read from the response's `data.upsert` collection.

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

Upload, import, list, and delete media files. Request upload authorization, transfer the exact declared number of bytes using the returned method and headers, and then confirm the upload. Media can also be imported directly from a URL. Supported import types include `video/mp4`, `image/png`, `image/jpeg`, and `image/webp`. Media URLs are retained as source metadata for scheduling. Numeric media type codes and object dimensions are exposed alongside the original metadata without changing existing string fields.

### AI Content Generation

Generate text content using AI. You can send a prompt and specify how many result variations to generate. AI usage is credit-based, and you can check available credits per team.

### Pinterest Board Listing

Retrieve the list of Pinterest boards for a connected Pinterest channel. This is needed when scheduling Pinterest posts, as a board ID is required for publishing.

## Events

The public API reference does not document webhook registration, event subscriptions, or callbacks. It also does not document a current-user/profile endpoint; `list_teams` provides authorized-container discovery.

## Response handling

Paginated media and schedule lists read `data.rows` and return the provider's `next` cursor. Original provider records preserve nullable fields and additional details. Legacy string role/status summaries contain the decimal representation of numeric provider codes. Optional string summaries omit incompatible null/object values while the original record retains them. Missing required identifiers, names, credit counts, or mutation acknowledgements produce an actionable service error. Provider error envelopes are checked even when HTTP succeeds.
