# Google Ads Specification

## Overview

Google Ads is Google's online advertising platform that allows advertisers to create and manage ad campaigns across Google Search, Display Network, YouTube, and other Google properties. The Google Ads API enables programmatic management of advertising accounts, campaigns, ads, keywords, bidding strategies, audience targeting, conversion tracking, and reporting.

## Authentication

The integration uses OAuth 2.0 to access the Google Ads accounts authorized by the user. API access levels belong to the Google Cloud project that owns the OAuth client ID and secret.

### Prerequisites

1. **Google Cloud Project**: Enable the Google Ads API and create OAuth 2.0 credentials in the project used by the application.
2. **API Access**: Review the project's [Google Ads API Overview](https://console.cloud.google.com/apis/api/googleads.googleapis.com/overview). Test access supports test accounts only. Explorer access supports production accounts with feature restrictions; **Basic or Standard access is required for Generate Keyword Ideas**. New Basic and Standard access applications require brand verification. For Standard access, verify that the approved permissible use covers campaign management, reporting, and keyword research.
3. **Google Ads Account Access**: The authorizing user must have access to the target Google Ads customer account. Set the optional manager customer ID when accessing client accounts through a manager account.

For managed OAuth credentials, the application operator manages API access on the OAuth project's behalf. When supplying custom OAuth credentials, use a project with the necessary Google Ads API access.

### OAuth 2.0 Flow

Users authorize the application with its OAuth client ID and secret. The integration stores the access token, refresh token, and expiration time, and refreshes access tokens automatically.

The Google Ads scope is `https://www.googleapis.com/auth/adwords`. User email and profile scopes identify the connected user.

### Required Headers

API requests send `Authorization: Bearer <access_token>`. Requests through a manager account also send `login-customer-id` with that manager's customer ID, without hyphens.

### Token Endpoint

Authorization codes and refresh tokens are exchanged at `https://oauth2.googleapis.com/token`.

### Developer Token Retirement

Google sunset developer tokens on September 9, 2026. No developer token is requested or sent by this integration. Existing saved values are unused and do not require a credential migration or reconnection.

Review access on the actual OAuth Cloud project rather than applying through the retired Google Ads API Center. See Google's [migration guide](https://developers.google.com/google-ads/api/docs/api-policy/developer-token) and [access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels).

## Features

### Campaign Management

Create, update, pause, and remove advertising campaigns across multiple campaign types including Search, Display, Video, Shopping, Performance Max, and App campaigns. Configure campaign-level settings such as budgets, start/end dates, geographic targeting, language targeting, and ad scheduling.

### Ad Group and Ad Management

Automatically generate keywords, ad text, landing pages, and custom reports. Create and manage ad groups within campaigns, and configure ads of various formats including text ads, responsive ads, image ads, and video ads. Update ad copy in real-time based on business data.

### Keyword Management

Add, update, and remove keywords within ad groups. Configure match types (broad, phrase, exact) and set keyword-level bids. Manage negative keywords at both campaign and ad group levels.

### Bidding Strategy Management

The Google Ads API offers a range of customizable bidding strategies that allow you to automate your bidding process and achieve your campaign goals. Available strategies include Manual CPC, Manual CPM, Enhanced CPC, Maximize Conversions, Maximize Conversion Value, Target CPA, Target ROAS, and more.

### Keyword Planning

Keyword Planning is a process for getting keyword metrics and forecasts as well as searching for new keywords to add to campaigns. The functionality is similar to the Keyword Planner tool in the Google Ads UI. Historical metrics provide data on how keywords have previously performed on Google Search. Forecast metrics provide a more exact estimate of future campaign performance.

### Audience Targeting

The API provides tools to implement sophisticated targeting strategies. One method is "Audience segments", also known as user lists, which are groups of people with specific interests, intents, or demographic information. Supports CRM-based user lists, rule-based user lists, remarketing lists, and similar audiences. Also supports geo-targeting and location-based targeting.

### Conversion Tracking and Management

The Google Ads API allows for programmatic management of the entire conversion management workflow, covering creating, importing, adjusting, monitoring, and grouping conversion actions. Import offline conversions to measure real-world transactions such as qualified leads over the phone or in-office payments. Enhanced conversions for web can improve the accuracy of your conversion measurement by supplementing existing conversion data with hashed first-party customer data in a privacy-safe way.

### Reporting and Analytics

Report on conversions by retrieving data about specific conversion actions or retrieving conversion metrics for other resources like campaigns, ad groups, and ads. Use Google Ads Query Language (GAQL) to build custom queries across all resource types. Compile your Google Ads data to use with other systems like inventories, generate regular reports, and make campaign adjustments in bulk.

### Account Management

Using a manager account, you can control client accounts and run operations without logging into each account separately. List accessible customer accounts, manage account hierarchies, and handle multi-account operations.

### Reach and Frequency Forecasting

Plan video and display campaigns by generating reach and frequency forecasts. Access to ReachPlanService requires separate approval for the Google Cloud project, even if it is approved for other Google Ads API services.

## Events

Webhook is not supported in the Google Ads API for general account or campaign changes.

However, Google Ads does support one specific webhook mechanism:

### Lead Form Webhook

POST requests to the webhook are sent in JSON format, adhering to a specific schema for user lead data. The JSON payload includes fields for lead identification, user-submitted data, form and campaign details, and verification keys. User-submitted data is contained within `user_column_data`, using `column_id` and `string_value` to represent the data type and its value.

- Configured per lead form extension within Google Ads campaigns.
- Requires a webhook URL and a verification key.
- Lead handlers should use the `lead_id` for deduplication and respond with specific HTTP codes indicating success or different types of errors.
- The `asset_group_id` field is only populated for Performance Max campaigns.
- Payload includes campaign ID, ad group ID, creative ID, click ID (gclid), and a test lead indicator.
