# Slates Specification for Meta Ads

## Overview

Meta Ads (officially the Marketing API) provides programmatic access to Meta's advertising platform, enabling management of ad campaigns across Facebook, Instagram, Messenger, and WhatsApp. The Marketing API is a collection of Graph API endpoints and other features that can be used to help you advertise across Meta technologies. The API encompasses campaign management, performance reporting via the Insights API, conversion tracking via the Conversions API, audience management, and access to the public Ad Library.

## Authentication

Meta Ads uses **OAuth 2.0** for authentication. All API calls require an access token that encapsulates the app credentials and the user's granted permissions.

### Prerequisites

- A Meta Developer account (separate from your personal Facebook account), an active ad account (handles billing and campaign management), a Facebook Business Manager account (central hub for organizing ad accounts), and business verification (required for advanced features).
- A Meta Developer App created at `developers.facebook.com` with the Marketing API product enabled.
- An App ID and App Secret obtained from the app's Basic Settings.

### OAuth 2.0 Flow

For third-party integrations serving multiple users, implement the standard Facebook Login OAuth flow:

1. Redirect users to Facebook's authorization dialog.
2. Users grant permissions to your app.
3. Receive an authorization code at your redirect URI.
4. Exchange the code for an access token.

The OAuth redirect URI must be registered under **Facebook Login > Settings > Valid OAuth Redirect URIs** in your app dashboard.

### Token Types

- **Short-lived User Access Tokens**: Short-lived tokens typically expire within one to two hours. Generated via the Graph API Explorer for testing.
- **Long-lived User Access Tokens**: To exchange your short-lived token for a long-lived one, make a specific API call to Meta's OAuth endpoint (`graph.facebook.com/oauth/access_token`) with parameters for `grant_type=fb_exchange_token`, `client_id` (your app ID), `client_secret` (your app secret), and `fb_exchange_token` (your short-lived token). The response returns a long-lived token you can use for the next 60 days.
- **System User Access Tokens**: System Users are special accounts designed for server-to-server authentication. System Users generate tokens that don't expire as long as the System User remains active. Created in Business Manager under Business Settings > Users > System Users.

### Required Permissions (Scopes)

Three core permissions are needed:

- `ads_management`: Allows your app to create, edit, and delete campaigns, ad sets, and ads (write access).
- `ads_read`: Lets you pull performance data, campaign details, and insights (read access).
- `business_management`: Enables management of business assets like ad accounts, pixels, and catalogs. Essential for tools that work across multiple ad accounts.

Additional permissions may be needed for specific features (e.g., `leads_retrieval` for lead ads, `pages_read_engagement` for lead ad webhooks).

### Permission Tiers

Meta's permission system operates on two levels: Standard Access and Advanced Access. When you first request permissions, you get Standard Access automatically—this works for development and testing but has limitations. To use the API in production (for other clients or accounts), you need Advanced Access, which requires app review and policy compliance.

## Features

### Campaign Management

Create, read, update, and delete advertising campaigns following Meta's three-tier hierarchy. Creating campaigns through the API follows Meta's three-tier hierarchy: Campaign (the top-level container defining your objective), Ad Set (where you set targeting, budget, and optimization), and Ad (the actual creative people see). Supports all campaign objectives (awareness, traffic, engagement, leads, app promotion, sales), status management (active, paused, archived), and budget configuration at campaign or ad set level. The Marketing API handles both Facebook and Instagram ads. When creating campaigns via API, you can specify Instagram placements and associate Instagram accounts with your ad creatives.

### Ad Creative Management

Upload and manage ad creatives including images, videos, carousels, collections, and dynamic creatives. Associate creatives with ads and manage creative assets at scale. Ad creatives are immutable once created — changes require creating new creatives.

### Audience Targeting and Custom Audiences

Define targeting criteria for ad sets including demographics, interests, behaviors, and locations. Create and manage Custom Audiences from customer data (email lists, phone numbers), website traffic (via Pixel), or app activity. Build Lookalike Audiences based on existing audiences to find similar users.

### Performance Insights and Reporting

The Insights API is the most critical component for performance marketers. It is an "edge" of the Marketing API designed specifically for asynchronous reporting. Unlike the core API, which shows you what an ad is, the Insights API shows you how it performed. It allows you to query performance data across different levels of granularity and breakdown (e.g., by day, region, or platform). This is how you get metrics like impressions, clicks, spend, conversions, ROAS, and more. Reports can be generated at account, campaign, ad set, or ad level with configurable date ranges and breakdowns.

### Conversions API

The Conversions API is designed to create a connection between an advertiser's marketing data (such as website events, app events, business messaging events and offline conversions) from an advertiser's server, website platform, mobile app, or CRM to Meta systems that optimize ad targeting, decrease cost per result and measure outcomes. This is a server-side alternative to browser-based tracking (Meta Pixel), designed to work around cookie restrictions and ad blockers. Requires a separate Conversions API access token and a dataset/pixel ID.

### Product Catalog Management

Automate catalog updates to keep product information, pricing, availability, and other details up-to-date across campaigns. Supports dynamic ads (Advantage+ catalog ads) that automatically show products from your catalog based on user behavior.

### Ad Library API

The Ad Library API provides programmatic access to publicly available ad data. While the Marketing API is for your accounts, the Ad Library API is for market research. The Ad Library API does not provide private performance KPIs like CTR or exact conversion rates. Spend and impressions are typically provided as broad ranges rather than precise figures. Access to this API is restricted and requires additional approval.

### Lead Ads

Lead Ads are part of the Marketing API and provide a way to capture leads through Facebook ads. Create lead generation forms, retrieve submitted lead data, and integrate leads with CRM systems. To access lead data, you need either Page Admin access or flexible permissions granted by the Page Admin.

## Events

Meta supports webhooks for ad-related events through its Graph API Webhooks infrastructure. Webhooks are configured by adding the Webhooks product to your Meta Developer App and subscribing to specific object types and fields. A Webhook trigger receives requests from Meta. The workflow detects verification requests (hub.mode=subscribe) and validates the Verify Token. Meta signs webhook payloads using HMAC-SHA256 with your App Secret for verification.

### Ad Account Events

Receive data from the Ad Account in real time with webhook subscriptions. Meta can send notifications when campaigns are approved, rejected, or when significant events occur. Subscribe to the Ad Account object to receive notifications about changes to campaigns, ad sets, ads, and their statuses (e.g., approval, rejection, delivery issues).

### Page Events (Lead Generation)

Receive data from the Page in real time with webhook subscriptions. The `leadgen` field on the Page object is particularly important for lead ads. When a new lead is submitted through a lead ad, an update is sent to your specified endpoint. Requires subscribing the app to the Page via the `/{page-id}/subscribed_apps` endpoint with `subscribed_fields=leadgen`. Requires `pages_manage_metadata` and `leads_retrieval` permissions.
