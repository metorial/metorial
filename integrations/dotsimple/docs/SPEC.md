Now let me fetch the full API reference page for more details:Now I have enough information to compile the specification. Let me also check the webhooks documentation:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Dotsimple

## Overview

DotSimple is a social media management platform based in Vienna, Austria, that allows users to plan, create, schedule, and publish content across multiple social networks (Facebook, Instagram, LinkedIn, X/Twitter, TikTok, Pinterest, YouTube, Mastodon) from a single workspace. It allows businesses and individuals to efficiently manage multiple social media accounts from a single platform, and to easily schedule, analyze, and publish content across various networks. The platform also provides analytics, AI-assisted content generation, a media library, tagging, and team collaboration features.

## Authentication

DotSimple uses **Bearer Token** authentication combined with a **Workspace ID**.

**Access Token:**
To create an Access Token, navigate to Settings > Access Tokens in the DotSimple dashboard and click "Create Token." Enter a name for your token and set the expiration date. You will be asked to enter your password to confirm. Copy the token immediately, as it will not be visible again.

**Workspace ID:**
Your Workspace ID is a unique UUID that is part of the URL for your DotSimple workspace. In DotSimple, navigate to the Analytics Dashboard or click the DotSimple logo. Check the URL in your browser's address bar, which will look like `https://app.dotsimple.io/app/<workspace-id>`.

**Making API Requests:**

All API requests are made to the base URL `https://app.dotsimple.io/app/api/{workspaceUuid}/` and require the Access Token passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

Users can access their data stored in the DotSimple service via the API interface, depending on the plan. API access may therefore be limited by subscription tier.

## Features

### Post Management

Create, read, update, delete, schedule, and queue social media posts across connected accounts. Posts support scheduling with date, time, and timezone parameters, immediate publishing, and adding to a publishing queue. Each post can target multiple social accounts and includes platform-specific options (e.g., TikTok privacy levels, YouTube visibility, LinkedIn visibility, Instagram post type, Pinterest board selection, Facebook post type). Posts support content versioning with body text and attached media. Multiple posts can be deleted in bulk by providing an array of post UUIDs.

### Social Account Management

List all connected social media accounts in the workspace to retrieve available accounts before posting or scheduling content. Supported providers include Facebook Pages, Instagram, LinkedIn, X/Twitter, TikTok, Pinterest, YouTube, and Mastodon.

### Media File Management

List all media files with optional pagination, and retrieve or browse uploaded media files page by page. You can also get details of a specific media file by its ID, and delete multiple media files from the workspace.

### Tag Management

Create new tags to categorize content with custom names and hex colors (e.g., a tag named "news" with color "#38bdf8"). You can also list all tags in a workspace, retrieve a specific tag by UUID, and delete tags.

### Reports and Analytics

List all account-level reports to fetch aggregated account metrics chronologically. This enables tracking performance across connected social media accounts.

### Autoresponders

List all autoresponders configured in the workspace to browse through your autoresponder setup.

## Events

DotSimple supports webhooks, described as a feature that enables real-time communication between DotSimple and external services. However, detailed public documentation on webhook configuration, available event types, and subscription management via the API is not available. Based on integration platforms (Pipedream), the following polling-based event sources are known:

- **New Post Created**: Emits a new event when a new post is created on the platform.
- **New File Uploaded**: Emits a new event when a new file is uploaded.
- **New Account Connected**: Emits a new event when a new account is connected.

Note: These event sources appear to be polling-based mechanisms implemented by third-party integration platforms rather than native DotSimple webhook subscriptions. The exact webhook API for configuring event subscriptions directly in DotSimple is not publicly documented at this time.
