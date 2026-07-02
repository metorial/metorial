# Slates Specification for Google Ads

## Overview

Google Ads is Google's online advertising platform that allows advertisers to create and manage ad campaigns across Google Search, Display Network, YouTube, and other Google properties. The Google Ads API enables programmatic management of advertising accounts, campaigns, ads, keywords, bidding strategies, audience targeting, conversion tracking, and reporting.

## Authentication

Google Ads API utilizes the OAuth 2.0 protocol for authentication and authorization, allowing your app to access user accounts without handling login information. In addition to OAuth 2.0 credentials, a developer token is also required to make Google Ads API calls.

### Prerequisites

1. **Developer Token**: A developer token is a 22-character alphanumeric string obtained from the API Center page of your Google Ads manager account. Each developer token has an access level (Test, Basic, or Standard) which determines the number of API calls and the environment (test or production) it can be used in. You need a Google Ads manager account to obtain a developer token.

2. **Google Cloud Project**: Enable the Google Ads API in your Google Cloud Console project and create OAuth 2.0 client IDs under "API & Services" > "Credentials".

### OAuth 2.0 Flows

The API supports two main OAuth 2.0 flows:

- **Web/Desktop Application Flow**: For apps that allow users to sign in and authorize your app to manage their Google Ads accounts on their behalf. Your app builds and manages the OAuth 2.0 user credentials using a Client ID, Client Secret, and Refresh Token along with the Developer Token and Login Customer ID.

- **Service Account Flow**: For workflows that don't require human interaction. This requires a configuration step where the user adds a service account to their Google Ads account, and the app can then use the service account's credentials to manage the user's Google Ads account.

### OAuth 2.0 Scope

The scope for the Google Ads API is `https://www.googleapis.com/auth/adwords`.

### Required Headers

When calling the Google Ads API, you need both OAuth 2.0 application credentials and a developer token. If making API calls with a Google Ads manager account, you must specify a `login-customer-id` header.

### Token Endpoint

Refresh tokens can be exchanged for access tokens at: `https://www.googleapis.com/oauth2/v3/token`

### Important Notes

- The Google Ads API does not support simultaneous sign-in with data access request (hybrid) or domain-wide delegation of authority (2LO).
- Your developer token needs approval to work with production Google Ads accounts but can be used immediately with a test manager account.

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

Plan video and display campaigns by generating reach and frequency forecasts. Developer tokens must be allowlisted specifically for the ReachPlanService, even if approved for other Google Ads API services.

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
