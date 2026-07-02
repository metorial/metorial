Now let me fetch the Postman collection to understand the API endpoints better.Now I have enough information to write the specification.

# Slates Specification for Reddit Ads

## Overview

Reddit Ads is Reddit's advertising platform that allows advertisers to create and manage ad campaigns targeting Reddit's community-based user base. It provides access to create, edit, and manage advertising and audiences on Reddit as well as view ad reporting. The API (currently at v3) supports programmatic campaign management, audience targeting by subreddit/interest/keyword, conversion tracking, and reporting.

## Authentication

Reddit Ads API uses **OAuth 2.0** for authentication. There are two distinct authentication flows depending on the use case:

### OAuth 2.0 Authorization Code Flow (for Ads API management)

Used for campaign management, audience management, and reporting.

1. **Register a developer application** at Reddit's app preferences page to obtain a **Client ID** and **Client Secret**.
2. Redirect the user to the authorization endpoint: `https://www.reddit.com/api/v1/authorize?client_id=CLIENT_ID&response_type=code&state=RANDOM_STRING&redirect_uri=REDIRECT_URL&duration=DURATION&scope=SCOPE_STRING`
3. After authorization, two query parameters (`state` and `code`) will be appended to your redirect URL. The `code` is a single-use login code used to acquire a refreshable access token.
4. Exchange the code for tokens via a POST to `https://www.reddit.com/api/v1/access_token` with `grant_type=authorization_code`, providing Client ID and Client Secret via HTTP Basic Auth.
5. The response returns an `access_token` and a `refresh_token`. Access tokens are valid only for 1 hour.

**Key OAuth endpoints:**

- Authorize URL: `https://www.reddit.com/api/v1/authorize`; Token URL: `https://www.reddit.com/api/v1/access_token`; Refresh URL: `https://www.reddit.com/api/v1/access_token`

**Scopes:**

- Scopes dictate which actions may be performed with the access token. Each endpoint's documentation lists the scopes required. You may set scopes to `adsread,history` if you would like your token to access everything in the Ads API.
- To update audiences, you need the `adsedit` scope. To add multiple scopes, separate the values by commas.

### Conversion Access Token (for Conversions API)

Used specifically for sending server-side conversion events:

- The conversion access token provides a bearer token added to the header. To get it: in your Reddit Ads account, navigate to Events Manager, select Conversions API, and click Generate Access Token.
- This token does not expire.
- Requires a **Pixel ID** associated with your Reddit Ads account.

**Base URL:** `https://ads-api.reddit.com/api/v3/` (v3) or `https://ads-api.reddit.com/api/v2.0/` (legacy)

## Features

### Campaign Management

Create and manage ad campaigns directly through the API. The campaign hierarchy follows an Account → Campaign → Ad Group → Ad structure. You can configure campaign objectives (traffic, conversions, impressions, etc.), set budgets, bidding strategies, scheduling, and placements (Feed, Conversations page).

- Supports multiple ad formats including text, image, video, and carousel ads.
- 13 call-to-action options are available, including "Shop Now," "Sign Up," "Download," "Install," and "Learn More."

### Audience Targeting and Management

Manage custom audiences and targeting configurations for ad groups. Custom audiences are curated lists of audiences that directly include or exclude redditors from targeting, created and accessed in the Audience Manager.

- Audience types include: website retargeting (via Reddit Pixel/Conversions API), customer lists (using privacy-safe emails and mobile advertising IDs), lookalike audiences, and engagement retargeting.
- Targeting methods include community (subreddit) targeting, keyword targeting, and broader interest categories.
- Users can be added to or removed from custom audiences, using hashed email (SHA256) or mobile advertising ID (MAID) identifiers.

### Conversion Tracking (Conversions API)

Send server-side conversion events directly to Reddit's Conversions API. This enables offline and server-side attribution of user actions back to Reddit ad interactions.

- Supported event types include Purchase, Add to Cart, Sign Up, Lead, and custom events.
- Each conversion event must include at least one attribution signal (e.g., click_id, email, external_id, or a combination of ip_address and user_agent).
- Event metadata can include item count, currency, monetary value, and product details.
- Hashed identifiers must use SHA256 and be lowercase.

### Product Catalog Management

For dynamic product ads, you can upload product catalogs and organize items into sets for better targeting and reporting. This enables Dynamic Product Ads (DPAs) that automatically show relevant products to users.

### Reporting and Analytics

Access campaign performance data including impressions, clicks, CTR, CPC, spend, and conversions. The V3 API offers an upgraded conversion data tracking interface with attribution windows aligned to account settings. Click and view-through conversion metrics are broken down by Click Attribution Window and View Attribution Window dimensions.

- Reports can be queried at the account, campaign, ad group, and ad level.
- Reddit displays data in UTC by default.

### Account Management

Manage advertiser account settings and access. The API allows retrieval of account-level information and configuration of account-wide settings such as billing and funding instruments.

## Events

The provider does not support webhooks or event subscription mechanisms. The Conversions API is a one-way data ingestion endpoint for sending conversion events _to_ Reddit, not for receiving events from Reddit. There is no built-in webhook or push notification system for campaign status changes or other advertising events.
