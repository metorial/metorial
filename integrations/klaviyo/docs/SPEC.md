Now let me search for more details on the OAuth scopes and the full API feature set:Now let me get the full list of available scopes and webhook topics:Now I have all the information I need to write the specification.

# Slates Specification for Klaviyo

## Overview

Klaviyo is a marketing automation platform primarily used by eCommerce brands to manage email, SMS, and push notification marketing campaigns. It provides tools for customer profile management, audience segmentation, automated messaging flows, product catalog management, and performance reporting. The platform integrates with eCommerce stores to leverage customer and behavioral data for personalized marketing.

## Authentication

Klaviyo supports three authentication methods:

### 1. Private API Key Authentication (Server-side)

Used for all server-side `/api` endpoints. A private API key is generated from the Klaviyo account under **Settings > API keys**. The key is passed via the `Authorization` header:

```
Authorization: Klaviyo-API-Key your-private-api-key
```

Private keys can be configured with scopes that restrict access. Scope options include:

- **Full Access Key** — read/write access to all endpoints
- **Read-Only Key** — view-only access
- **Custom Key** — granular control over individual scopes

Available scopes follow the pattern `{resource}:{permission}` (e.g., `profiles:read`, `profiles:write`, `events:read`, `lists:write`, `campaigns:read`, `flows:read`, `segments:write`, `catalogs:read`, `tags:read`, `templates:write`, `webhooks:read`, `webhooks:write`, etc.). Each API endpoint requires specific scopes, documented per endpoint.

A `revision` header (e.g., `revision: 2025-01-15`) must be included with every API request, specifying the API version to use.

### 2. OAuth 2.0 (Server-side)

Recommended for third-party integrations and required for apps listed on Klaviyo's App Marketplace. Uses the Authorization Code flow with PKCE (S256).

- **Authorization URL:** `https://www.klaviyo.com/oauth/authorize`
- **Token URL:** `https://a.klaviyo.com/oauth/token`
- **Revoke URL:** `https://a.klaviyo.com/oauth/revoke`

Setup steps:

1. Create an OAuth app in Klaviyo under **Integrations > Developers > Manage Apps > Create App**.
2. Configure scopes (space-separated, e.g., `accounts:read events:read events:write profiles:read profiles:write`). The `accounts:read` scope is required by default.
3. Set redirect URIs.
4. Save the client ID and client secret (secret is shown only once).

The OAuth flow requires PKCE: generate a `code_verifier` (43–128 random characters), compute the `code_challenge` as base64url-encoded SHA-256 of the verifier, and pass both `code_challenge` and `code_challenge_method=S256` in the authorization request. The `code_verifier` is then sent when exchanging the authorization code for tokens.

Access tokens are used as Bearer tokens. Refresh tokens are provided for token renewal.

### 3. Public API Key (Client-side)

Used only for client-side `/client` endpoints (e.g., tracking events, creating subscriptions from browsers). The public key is a 6-character site ID/company ID, passed as a `company_id` query parameter. Public keys cannot access sensitive data and are safe to expose in client-side code.

## Features

### Profile Management

Create, read, update, and merge customer profiles. Profiles can include contact information (email, phone), personal details, location data, custom properties, and external IDs. Supports subscribing/unsubscribing profiles to email and SMS marketing, suppressing/unsuppressing profiles, and accessing predictive analytics data. Profile deletion is handled through a separate Data Privacy API.

### Lists and Segments

Create and manage static lists of profiles, and dynamic segments based on conditions (e.g., location, purchase behavior, engagement, predictive analytics). Add or remove profiles from lists. Segments support complex condition definitions combining profile attributes, group membership, and event-based criteria with logical AND/OR groupings.

### Campaigns

Create, schedule, and send email, SMS, and push notification campaigns targeted at lists and/or segments. Supports campaign cloning, recipient estimation, assigning templates to campaign messages, and managing send jobs (including smart send time scheduling).

### Flows (Automation)

Manage automated messaging workflows (flows) triggered by events, list/segment membership, or dates. Create, retrieve, update status, and delete flows. Access flow actions and messages, including associated templates. Flows can include email, SMS, push notifications, and webhook actions.

### Events and Metrics

Track and retrieve custom events (actions taken by profiles), each associated with a metric (event type) and timestamp. Events can include custom properties and a monetary value. Create custom events that trigger flows (e.g., password reset, quiz completion). Access built-in Klaviyo metrics (e.g., Opened Email, Placed Order) and query metric aggregates for analytics. Custom metrics can also be created and managed.

### Catalogs

Manage product catalog data including items, variants, and categories. Catalog data powers product recommendations, back-in-stock notifications, price-drop flows, and dynamic template content. Supports subscribing profiles to back-in-stock alerts for specific catalog variants.

### Templates and Images

Create, update, clone, render, and delete email templates (HTML and hybrid/drag-and-drop). Manage universal content blocks reusable across templates. Upload and manage images for use in templates and campaigns.

### Coupons

Create and manage coupons and individual coupon codes. Supports bulk creation of coupon codes for use in campaigns and flows.

### Forms

Create, retrieve, and delete forms (e.g., sign-up popups). Access form versions.

### Tags

Organize resources (campaigns, flows, lists, segments) with tags and tag groups for easier management and filtering.

### Reporting

Query performance data for campaigns, flows, forms, and segments. Supports both aggregate values and time-series reports (hourly, daily, weekly, monthly) over custom time frames. Metrics include opens, clicks, conversions, revenue, and more.

### Reviews

Retrieve and update product reviews. Reviews can be filtered by item, rating, status, and other criteria. Klaviyo Reviews is a paid add-on.

### Custom Objects

Create custom data sources and bulk-create records, allowing integration of non-standard data into Klaviyo.

### Data Privacy

Request profile deletion to comply with privacy regulations (e.g., GDPR right-to-erasure requests).

### Tracking Settings

Read and update account-level UTM tracking configuration programmatically.

### Web Feeds

Create and manage web feeds that can be used to pull dynamic content into emails.

## Events

Klaviyo supports two types of webhooks for event subscriptions:

### System Webhooks (Webhooks API)

System webhooks forward Klaviyo events to external HTTP endpoints in real time with a predefined payload. Available only to Advanced KDP customers and Klaviyo app partners. Webhooks are created via the API or Klaviyo UI and require an HTTPS endpoint URL and a secret key (minimum 16 characters) for HMAC-SHA256 signature verification.

Supported event categories (topics) include:

- **Email events** — Triggered when emails are received, opened, clicked, bounced, marked as spam, etc.
- **SMS events** — Triggered when SMS messages are sent, received, clicked, etc.
- **Push notification events** — Triggered when push notifications are received, bounced, opened, etc.
- **Review events** — Triggered when reviews are ready, submitted, etc.
- **Consent events** — Triggered when profiles subscribe or unsubscribe from email or SMS marketing.

Each webhook can subscribe to multiple topics. A maximum of 10 webhooks per account is allowed. The full list of available topics can be retrieved from the Get Webhook Topics endpoint.

### Flow Webhooks

Flow webhooks are configured as actions within automation flows and send a custom JSON payload via HTTP POST to an external URL when a flow is triggered. They support events that can be used as flow triggers (e.g., Placed Order, Added to List, Added to Segment, date-based triggers). Flow webhooks do not support message-related events (e.g., Received Email, Clicked Email). The payload is manually constructed and can include profile properties and event data.
