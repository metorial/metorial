Now let me get the specific webhook event types and OAuth scopes:Now I have enough information to write the specification.

# Slates Specification for Dub

## Overview

Dub is a link attribution platform that provides short link management, click/conversion analytics, and partner/affiliate program infrastructure. Its API lets you manage resources programmatically, including creating links, creating partners, tracking lead and sale events, and retrieving analytics. Dub is the platform for short links, conversion tracking, and affiliate programs.

## Authentication

Dub supports two authentication methods:

### API Key (Bearer Token)

Authentication to Dub's API is performed via the Authorization header with a Bearer token. To authenticate, include the `Authorization` header with the word `Bearer` followed by your API key.

- **Base URL**: `https://api.dub.co`
- **Header**: `Authorization: Bearer dub_xxxxxx`
- API keys start with the prefix `dub_`.
- API keys are created in your workspace under Settings > API Keys, where you select the permissions to grant.
- When creating a key, you can select the permissions it has, which will give the key access to certain (or all) resources on Dub. Available permission scopes include read/write access to Links, Analytics, Domains, Tags, and other resources.
- You can create API keys associated with a "Machine user", which is helpful when you don't want to associate the key with a particular user. Machine users share the same permissions as the owner role.

### OAuth 2.0 (Authorization Code with PKCE)

Dub supports OAuth 2.0 authentication for building integrations.

- **Authorization URL**: `https://app.dub.co/oauth/authorize`
- **Token URL**: `https://api.dub.co/oauth/token`
- **User Info URL**: `https://api.dub.co/oauth/userinfo`
- **Grant Type**: Authorization Code
- PKCE (Proof Key for Code Exchange) is enabled by default and recommended for all applications.
- Access tokens expire in 7200 seconds (2 hours). Refresh tokens are provided.
- You can request access to specific scopes when redirecting users to the authorization URL. Scopes are permissions the user needs to grant. Scopes follow the format `resource.permission` (e.g., `links.write`, `tags.write`, `domains.read`).
- To set up OAuth, go to the OAuth Apps tab in your workspace and create an OAuth App by filling in the required fields.

## Features

### Link Management

Create, update, delete, list, and upsert short links. Links support built-in QR codes, device/geo-targeting, A/B testing, deep links, and more.

- Links can be configured with custom domains, slugs, expiration dates, passwords, UTM parameters, and tags.
- Links can use Custom Social Media Cards to control how they appear when shared on social media.
- Links support an `externalId` to map to your own system's identifiers.
- Conversion tracking can be enabled per link.
- Links can be organized into folders and tagged for categorization.
- Webhook IDs can be associated with links so specific webhooks fire when the link is clicked.

### Custom Domains

Manage custom domains for your short links. You can add up to 3 custom domains to your workspace for free, and more with paid plans.

### Analytics

Retrieve powerful analytics for your links, including geolocation, device, browser, and referrer information.

- Analytics can be retrieved for a specific link, domain, workspace, partner, program, or customer.
- Configurable time intervals (defaults to 24h), custom start/end dates, and time zones.
- Includes totals for clicks, leads, and sales, and aggregations by metadata dimensions such as country, city, browser, device, referrer, etc.
- Sales can be filtered by type: 'new' for first-time purchases, 'recurring' for repeat purchases.

### Conversion Tracking (Events)

With Dub Conversions, you can turn any short link into a full attribution engine, allowing you to understand how well your links are translating to actual users and revenue.

- Track lead events when a user performs an action such as signing up.
- Track sale events when a purchase occurs, with native Stripe and Shopify integrations available.
- Includes a funnel chart view visualizing conversion and dropoff rates across clicks → leads → sales.

### Customers

Manage and track customers through the conversion funnel. Customers are identified by a unique ID and can be associated with link clicks for attribution.

### Tags

Create, update, delete, and list tags used to categorize and organize links.

### Partners (Affiliate/Referral Programs)

All-in-one partner management platform for building affiliate and referral programs.

- Create and manage partners within programs.
- Retrieve analytics for individual partners.
- Manage commissions and bounties.
- Process payouts to partners.
- Ban or deactivate partners.

### QR Codes

Generate branded QR codes for your links, built directly into Dub. QR codes are automatically available for every short link.

### Metatags

Retrieve Open Graph metadata (title, description, image) for any URL. Useful for generating link previews.

## Events

Webhooks allow you to listen to real-time events happening across your Dub workspace. Webhooks are configured in the workspace settings and deliver events via HTTP POST to your specified endpoint. All webhooks are delivered with a `Dub-Signature` header for verification using HMAC-SHA256.

Bulk link operations (bulk create, bulk update, bulk delete) do not trigger webhook events.

### Link Events

Events related to the lifecycle of short links in your workspace.

- **`link.created`** – Fired when a new link is created.
- **`link.updated`** – Fired when a link is updated.
- **`link.deleted`** – Fired when a link is deleted.
- **`link.clicked`** – Fired when a link is clicked. Due to the high volume nature of click events, they are scoped to specific links. You need to specify which link(s) when creating the webhook.

### Conversion Events

Events related to conversion tracking (leads and sales).

- **`lead.created`** – Fired when a new lead conversion event is tracked.
- **`sale.created`** – Fired when a new sale conversion event is tracked.

### Partner Events

Events related to the partner/affiliate program.

- **`partner.enrolled`** – Fired when a partner is enrolled in a program.
- **`partner.application_submitted`** – Fired when a partner submits an application.
- **`commission.created`** – Fired when a new commission is created for a partner.
- **`payout.confirmed`** – Fired when a payout to a partner is confirmed.
