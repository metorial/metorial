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

### Lead received

Enable callbacks for `lead_received` to receive `lead.received` events from Google Ads lead forms. General account/campaign changes are not included. The existing `adwords` scope is used; no additional OAuth consent is requested.

Discovery starts with directly accessible customers and reads each root customer's identity and manager status. Enabled advertiser accounts are searched for forms directly; only manager accounts are queried through `customer_client`, without a depth filter, to include manager descendants. Each `LEAD_FORM` asset is a stable target keyed by its customer and asset IDs. Discovery is bounded to 100 API calls (including root classification) and 200 client customers per cycle, and 1,000 eligible forms per page; reaching a limit produces a partial-discovery diagnostic. Empty pages continue pagination, permission-denied accounts are skipped, and quota/server failures remain retryable. Google fixes GAQL search page size at 10,000 rows.

Google permits one webhook delivery method per form. Existing third-party destinations are skipped and preserved. Already registered destinations remain discoverable. Registration rechecks the asset identity and vacant webhook slot, generates a random secret, updates only `lead_form_asset.delivery_methods` (payload schema version 3, as in Google's [lead form sample](https://developers.google.com/google-ads/api/samples/add-lead-form-asset)), and reads the configuration back. A webhook left by an earlier registration attempt for the same receive URL, whose result was never saved, is replaced with a new secret; a webhook with any other destination is never changed. Other form fields and campaign associations are not changed. On failed verification it attempts ownership-checked rollback and confirms removal. Cleanup removes only the exact saved URL/secret configuration, preserves a replacement destination, and requires authorized readback before reporting success. Inaccessible or missing assets do not count as confirmed cleanup.

The API has no conditional asset update or ETag. An external change racing between the eligibility read and mutation cannot be made atomic. Avoid editing delivery settings concurrently with callback setup or removal. Enabling callbacks may fail if the current Google Ads account does not permit the asset update; the integration does not delete/recreate the form to work around that restriction.

Incoming POST bodies are decoded as strict UTF-8 and parsed without rounding 64-bit numbers. The confidential `google_key` body value must match the saved random secret. This protocol has no HMAC signature or signed freshness timestamp; a timestamp check would reject legitimate delayed deliveries without proving authenticity. The key is the only authentication Google defines for these deliveries, so every delivery carrying the correct key is accepted. Google describes `form_id` as the unique ID of the form but does not state that it equals the lead form asset ID, and it does not retry a `4xx` response; a lead whose `form_id` differs from the registered asset ID is therefore still delivered, with a logged warning, and `formId` reports the value Google sent. A `lead_source` value, which Google's published payload does not define, is passed through as `leadSource` and never used to discard a lead. Authenticated `is_test: true` deliveries are acknowledged without creating a lead, including Google's unsaved-form dummy IDs. False/omitted `is_test` means production. Accepted deliveries are answered with status `200` and the JSON body `{}`, as Google documents. Secrets are removed before events are emitted.

`lead_id` is the stable event ID and deduplication key. Repeated deliveries within the callback service's approximately 24-hour deduplication window are suppressed; later replays can recur. Consumers requiring permanent exactly-once intake should also deduplicate by lead ID. Customer ID comes from the verified registration because Google's webhook does not include it. All numeric IDs are decimal strings, including zero-valued optional ad IDs. Unknown answer column IDs and repeated columns are preserved in order.

Example output:

```json
{
  "leadId": "google-lead-unique-id",
  "customerId": "1234567890",
  "formId": "9007199254740993",
  "campaignId": "9876543210",
  "contact": { "fullName": "Example Person", "email": "test@example.com" },
  "answers": [
    { "column_id": "FULL_NAME", "string_value": "Example Person" },
    { "column_id": "EMAIL", "string_value": "test@example.com" }
  ]
}
```

Optional output fields include `adGroupId`, `creativeId`, `assetGroupId`, `googleClickId`, `submittedAt`, `leadStage`, and `leadSource`. The contact object also exposes first/last name, phone, company, job title, and work contact details when supplied. All answers remain available even if no normalized contact field exists.

### Verification boundary

Local contract tests cover parsing, keys, acceptance of differing form IDs after a valid key, diagnostics, deduplication identity, discovery, ownership, readback and cleanup failures. Provider acceptance of updating/clearing delivery methods on an existing asset, real callback routing, and whether the delivered `form_id` equals the configured asset ID require a live test; local fixtures do not prove those behaviors.

The private lifecycle scenario is gated by an explicit `suiteOwnedLeadForm` fixture containing `resourceName` and `allowWebhookLifecycle: true`. It uses a reserved `.invalid` receiver, reads back the delivery configuration, clears only its owned webhook, verifies absence, and repeats cleanup. It never creates an asset because AssetService has no remove operation. It must target a dedicated test form with a vacant slot and does not validate real callback delivery.

References: [lead webhook payload](https://developers.google.com/google-ads/webhook/docs/implementation), [Google test leads](https://developers.google.com/google-ads/webhook/docs/testing), [lead form delivery methods](https://developers.google.com/google-ads/api/reference/rpc/v24/LeadFormAsset), [webhook fields](https://developers.google.com/google-ads/api/reference/rpc/v24/WebhookDelivery), [asset update](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetOperation), [manager hierarchy](https://developers.google.com/google-ads/api/docs/account-management/get-account-hierarchy).
