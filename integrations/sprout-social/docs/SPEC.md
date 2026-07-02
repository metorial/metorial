Now let me get more details on the OAuth 2.0 implementation and the specific API documentation:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Sprout Social

## Overview

Sprout Social is a social media management platform that provides publishing, analytics, engagement, and listening tools across multiple social networks including X, Facebook, Instagram, LinkedIn, YouTube, TikTok, Pinterest, Threads, and Bluesky. Its API enables external access to owned social profile data, post analytics, message retrieval, social listening insights, customer care cases, and draft post creation.

## Authentication

Sprout Social supports two authentication methods. Both use a Bearer token in the `Authorization` header.

### OAuth 2.0 (Recommended)

Sprout's API supports OAuth 2.0 to access the API. It issues short-lived JWT access tokens. Two OAuth grant types are supported:

**Machine-to-Machine (Client Credentials Grant):**

- Create an OAuth client configuration in Sprout under Settings > Global Features > API > OAuth Client Management.
- Retrieve the `client_id` and `client_secret`.
- Token endpoint: `https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c/v1/token`
- Authorization server metadata: `https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c/.well-known/oauth-authorization-server`
- Grant type: `client_credentials`
- Scope: `organization_id`

**User-Based (Authorization Code Grant):**

- Create an OAuth client configuration and specify allowed redirect URIs.
- Use the Authorization Endpoint and Token Endpoint listed on the Authorization Server metadata URL above.
- Users authenticate by logging in with their Sprout Social credentials.

### API Tokens

Navigate to Account and Settings, then under Global Features, select API. In the API Token Management section, you can view existing tokens or generate a new one by clicking Generate API Token. The token is then used as a Bearer token.

There isn't a defined expiration period for the API tokens, but periodic regeneration is recommended.

### Prerequisites

- Your account must be on an Advanced plan to include API access.
- To generate and manage API tokens, a user must have the API Permissions entitlement.
- You must accept Sprout's Analytics API Terms of Service under Settings > Global Features > API.
- Accessing X (Twitter) data requires an additional acceptance of the X Content End User License Agreement.

### API Base URL

`https://api.sproutsocial.com`

All endpoints are scoped to a customer ID: `/v1/<customer_id>/...`

## Features

### Account & Profile Metadata

Retrieve high-level information about your Sprout Social account, including customer IDs, connected social profiles, groups, tags (labels and campaigns), users, teams, listening topics, and case queues. This data is needed to make requests to other API endpoints (e.g., obtaining `customer_profile_id` values for analytics queries).

### Profile Analytics

Access owned profile data matching the data available in Sprout's Profile Performance reports for X, Facebook, Instagram, LinkedIn, Pinterest, TikTok, and YouTube. Metrics are aggregated daily and include impressions, follower counts, engagement, video views, and more. Results can be filtered by profile IDs and reporting period.

- Analytics data is available for X, Facebook, Threads, Instagram, LinkedIn, Pinterest, YouTube and TikTok.
- Owned demographic data is available for Facebook Pages, Instagram Business Profiles, LinkedIn Pages, and TikTok Profiles (e.g., followers by age, gender, city, country).
- Some metrics require the Premium Analytics add-on.

### Post Analytics

Access post data matching the data available in Sprout's Post Performance Report. Query individual published posts with their content, metadata (tags, author, permalink), and lifetime performance metrics (impressions, reactions, comments, shares, video views, etc.). Results can be filtered by profile, creation time, and sorted by various fields.

### Messages

Retrieve detailed data about messages published by or received by your owned profiles. This includes posts, comments, direct messages, mentions, reviews, and replies across all connected networks. Messages can be filtered by group, profile, time range, post type, tags, and language. Metadata includes Sprout actions taken on messages (reply, tag, complete, like) and associated case IDs.

- Direct messages containing images or videos are not retrievable; only text-based DMs are supported.

### Publishing Posts

Create and manage Publishing posts within Sprout that are intended to be published to social networks at a future time. Posts can be created as drafts with optional scheduled delivery times, text content, media attachments, and tags.

- Only posts created in draft status are supported at this time.
- Supports the following profile types: Instagram Business and Creator, Facebook Pages, Threads, X, LinkedIn Pages and Personal, YouTube, TikTok, Pinterest, and Google My Business.
- Instagram Mobile Publisher and story posts cannot be created directly.
- Posts can target multiple profiles and multiple scheduled times; Sprout will fan out one calendar entry per profile/time combination.

### Media Upload

Upload media files (images and videos) for use with publishing posts. Supports three upload methods: single file upload (up to 50 MB), multipart upload for larger files (in 5 MB chunks), and download from a publicly accessible URL.

- Media sent to Sprout via the API is normally retained for 24 hours before it is removed unless used by other API operations.

### Social Listening

Retrieve earned media data from Listening Topics, including topic messages and aggregated topic metrics. Messages can be filtered and searched by text, network, sentiment, language, location, explicit content label, and more. Metrics can be dimensioned by time period, sentiment, network, media type, and location.

- Listening data from X is currently unavailable.
- Available metrics include total engagement, likes, replies, shares, impressions, volume, sentiment counts, and author counts.

### Cases (Customer Care)

A case refers to a customer inquiry, issue, or other engagement that may require action by a social care agent. Cases can have one or many messages associated with it. Retrieve cases filtered by creation time, update time, latest activity time, status (open, on hold, closed), priority, type (general, support, lead, question, feedback), queue, assigned user, and tags.

- Date filter ranges are limited to one week maximum.

### Tableau Connector

Sprout provides a direct Web Data Connector for Tableau that pulls profile data, post data, and tag data into Tableau for visualization. Requires the Premium Analytics add-on and an Advanced Plan.

## Events

The provider does not support webhooks or event subscriptions through its public API. Sprout Social offers a Slack notification integration for internal workflow notifications (approvals, cases), but this is a built-in notification feature rather than a general-purpose webhook or event subscription system exposed via the API.
