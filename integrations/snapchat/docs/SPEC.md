# Slates Specification for Snapchat

## Overview

Snapchat (by Snap Inc.) is a multimedia messaging and social media platform. Snapchat offers a range of APIs through its Snap Kit, Lens Studio, and Marketing API, allowing developers to integrate Snapchat's features into their own applications. The primary server-side APIs are the Ads API (Marketing API), Conversions API, and Public Profile API, focused on advertising management, conversion tracking, and creator profile data.

## Authentication

Snapchat uses **OAuth 2.0** for authentication across its APIs.

### Setup

OAuth apps are set up in the 'Business Details' section in Snap Business Manager; you need to be an Organization Admin to see the app dashboard. When setting up an OAuth app you need to provide a name and a redirect_uri, where the user is redirected upon authentication.

### OAuth 2.0 Authorization Code Flow

1. **Authorize:** Redirect the user to Snapchat's authorization endpoint:
   ```
   https://accounts.snapchat.com/login/oauth2/authorize
     ?client_id={client_id}
     &redirect_uri={redirect_uri}
     &response_type=code
     &scope=snapchat-marketing-api
   ```
2. **Exchange code for tokens:** POST to the token endpoint:

   ```
   https://accounts.snapchat.com/login/oauth2/access_token
   ```

   with `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, and `redirect_uri`.

3. **Refresh tokens:** The access token is valid for 3600 seconds (60 minutes). When the access token expires, generate a new one using the refresh token by POSTing to the same token endpoint with `grant_type=refresh_token`.

The Marketing API uses access tokens to control access and authenticate requests. The access token should be included in all API requests in the Authorization header as a Bearer token.

### Scopes

Scopes are passed as a space-separated list. Key scopes include:

- **Marketing API:** `snapchat-marketing-api` — access to the Ads API
- **Offline Conversions:** `snapchat-offline-conversions-api` — for sending offline conversion events
- **Profile API:** `snapchat-profile-api` — access to the Public Profile API
- **Login Kit scopes** (full URL format):
  - `https://auth.snapchat.com/oauth2/api/user.display_name` — user's display name
  - `https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar` — user's Bitmoji avatar (toggleable)
  - `https://auth.snapchat.com/oauth2/api/user.external_id` — stable user ID for your app

### Conversions API Authentication

Snapchat uses static long-lived tokens for making Conversions API calls. These tokens are generated on the Business Details page of Ads Manager. Long-lived tokens have no expiration date.

## Features

### Campaign Management

Create, update, and manage the full advertising hierarchy: organizations, ad accounts, campaigns, ad squads (ad sets), and individual ads. Supports campaign objectives such as app installs, purchases, video views, leads, and brand awareness. Campaigns can be configured with budgets, schedules, and bid strategies.

### Creative & Media Management

Upload media assets (images, videos), create ad creatives, and manage creative elements. Supports multiple ad formats including Snap Ads, Story Ads, Collection Ads, Commercial Ads, and AR Lens ads. Dynamic Product Ads can be generated automatically from product catalogs.

### Audience Targeting & Custom Audiences

Target users by demographics, location, interests, device type, and behaviors. Build custom audiences from hashed first-party data (customer lists with emails, phone numbers, or mobile ad IDs). Create website-based custom audiences using Snap Pixel events, and build lookalike audiences from existing segments.

- Audience size estimation is available to preview reach before launching.

### Measurement & Reporting

Pull campaign performance statistics with hourly, daily, or lifetime granularity. Metrics include impressions, swipe-ups, spend, conversions, and more. Supports delivery status checks and bid estimates.

### Conversions API (CAPI)

Snap's Conversions API is a structured, privacy-centric interface that allows you to directly pass web, app, and offline events to Snap via a Server-to-Server (S2S) integration. Supported event types include purchases, add-to-cart, page views, sign-ups, and up to 5 custom events. Requires a Snap Pixel ID (for web/offline events) or Snap App ID (for mobile events).

- Events must include user-matching parameters (email, phone, IP, cookie ID, etc.) for attribution.
- Supports deduplication with Snap Pixel via `client_dedup_id`.

### Public Profile API

Access creator and business profile data on Snapchat, including profile information, Stories, Spotlights, and Lenses. Retrieve engagement statistics (views, shares, subscribers) with optional demographic breakdowns.

- The Public Profile API is currently allowlist only.
- Has both public endpoints (no user auth required) and authorized endpoints (requiring creator consent for additional data).

### Lead Generation

Collect leads directly within Snapchat through customizable lead forms attached to ads. Leads can be retrieved programmatically via the API.

### Organization & Account Administration

Manage organization members, roles, funding sources, billing centers, invoices, and transactions. Control access permissions across ad accounts.

### Audience And Bid Planning

Estimate potential audience size and bid ranges before launching or changing ad squads. This is useful for validating that a targeting spec is broad enough and that proposed bids are realistic for the selected optimization goal.

### Snap Pixel Management

Read and update existing Snap Pixels for tracking website events. Pixel creation is handled in Snapchat Ads Manager; the Marketing API supports retrieving the pixel associated with an ad account, getting a specific pixel, and updating pixel metadata.

## Events

The official Snapchat Ads API does not appear to have native webhook functionality. The search results do not contain any direct information about webhooks specifically for the Snapchat Ads API.

The provider does not support webhooks or built-in event subscriptions. The Conversions API is designed for _sending_ events to Snapchat (not receiving them). There is no purpose-built polling mechanism for receiving real-time notifications about campaign changes, lead submissions, or other platform activity.
