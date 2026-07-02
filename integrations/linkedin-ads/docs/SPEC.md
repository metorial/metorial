Now let me get the specific permissions/scopes list for the Advertising API:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Linkedin Ads

## Overview

LinkedIn Ads is LinkedIn's advertising platform that enables businesses to create, manage, and optimize ad campaigns targeting professional audiences. The platform offers APIs to create LinkedIn marketing campaigns, to report campaign performance, to manage leads, and to grow a company Page. The API is part of the broader LinkedIn Marketing Developer Platform and requires an approved application to access.

## Authentication

The LinkedIn API uses OAuth 2.0 for user authorization and API authentication. There are two OAuth 2.0 flows available:

### 3-Legged OAuth (Authorization Code Flow)

This is the primary flow used for LinkedIn Ads. The Authorization Code Flow is used for applications to request permission from a LinkedIn member to access their account data, with the level of access explicitly requested using the scope parameter.

**Steps:**

1. Configure your application in the Developer Portal to obtain Client ID and Client Secret.
2. Your application directs the browser to LinkedIn's OAuth 2.0 authorization page where the member authenticates. After authentication, LinkedIn passes an authorization code to your application. Your application sends this code to LinkedIn and LinkedIn returns an access token. Your application uses this token to make API calls on behalf of the member.

**Endpoints:**

- Authorization URL: `https://www.linkedin.com/oauth/v2/authorization`
- Token URL: `https://www.linkedin.com/oauth/v2/accessToken`

**Token Lifetimes:**

- Access tokens expire after 60 days.
- Refresh tokens expire after 12 months.

### 2-Legged OAuth (Client Credentials Flow)

Application Authorization or using 2-Legged OAuth grants permissions to your application to access protected LinkedIn resources. If you are accessing APIs that are not member specific, use this flow. Not all APIs support Application Authorization. For example, Marketing APIs you must use Member Authorization.

### Required Scopes

The Advertising API grants the following OAuth scopes upon approval:

| Scope                    | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `r_ads`                  | Retrieve advertising accounts                                    |
| `r_ads_reporting`        | Retrieve reporting for advertising accounts                      |
| `rw_ads`                 | Manage and read an authenticated member's ad accounts            |
| `r_basicprofile`         | Access basic profile (name, photo, headline, public profile URL) |
| `r_organization_admin`   | Retrieve organization pages and reporting data                   |
| `r_organization_social`  | Retrieve organization posts and engagement data                  |
| `rw_organization_admin`  | Manage organization pages and retrieve reporting data            |
| `w_member_social`        | Post, comment, and like posts on the member's behalf             |
| `w_organization_social`  | Post, comment, and like posts on the organization's behalf       |
| `r_1st_connections_size` | Retrieve the number of 1st-degree connections                    |

Additional scopes are available through separate API products:

| Scope                            | API Product                                        |
| -------------------------------- | -------------------------------------------------- |
| `rw_dmp_segments`                | Matched Audiences API (requires separate approval) |
| `rw_conversions`                 | Conversions API (requires separate approval)       |
| `r_marketing_leadgen_automation` | Lead Sync API (requires separate approval)         |

### Access Requirements

Developers seeking to build a marketing related integration using Advertising API permissions must be approved. You can apply for access through the Developer Portal. To do this, select your app from My Apps, navigate to the Products tab, and add the Advertising API product. The application must be associated with a verified LinkedIn Company Page.

## Features

### Campaign Management

Create, edit, and manage the full advertising hierarchy: ad accounts, campaign groups, campaigns, and creatives. Build functionality for scalable ads management with Ad Campaigns and Creatives APIs. Supports various ad formats including Sponsored Content, Text Ads, Message Ads, Document Ads, and Event Ads. Campaigns can be configured with objectives such as brand awareness, website visits, engagement, video views, and lead generation.

- Manage campaign budgets, schedules, bidding strategies, and statuses.
- Development tier supports read-only access for unlimited ad accounts and edit capabilities for up to five Ad Accounts.
- Standard tier is designed to support campaign management solutions for multiple ad accounts.

### Audience Targeting

Leverage LinkedIn's first-party data to target specific audiences based on demographics like job function, industry, seniority, or company size. Supports building targeting criteria for campaigns based on professional attributes.

- Easily create audience segments and target on LinkedIn with DMP Segments API. (Requires Matched Audiences API approval.)
- Matched Audiences, Audience Insights, and Media Planning API are private APIs and require additional approval.

### Reporting & Analytics

Build holistic view of marketing performance. Use the Ad Analytics API to pull campaign analytics data for measuring their performance. Access metrics including impressions, clicks, engagement, conversions, and cost data.

- Reports can be broken down by campaign, creative, date ranges, and other dimensions.
- Gain insights into company level data for all companies reached via LinkedIn with engagement score, paid impressions, paid clicks, leads, organic impressions, and organic engagements. (Requires Company Intelligence API approval.)

### Conversion Tracking (Conversions API / CAPI)

With Conversions API, you can connect both your online and offline data to LinkedIn so you can see how your campaigns influenced actions taken on your website, sales completed over the phone, or leads collected in-person at an event.

- Create conversion rules specifying conversion type, attribution model, and attribution window (1, 7, 30, or 90 days).
- Send server-side conversion events with user identifiers (hashed email, LinkedIn click ID, etc.).
- Strengthen performance and privacy by driving a more efficient Cost Per Action with a reliable and secure data connection that doesn't rely on cookie-based tracking.
- Requires separate approval for the Conversions API product and the `rw_conversions` scope.

### Lead Management (Lead Sync API)

Collect and manage leads generated through LinkedIn Lead Gen Forms. Collect and attribute leads from more sources including a LinkedIn ad, Page, event, Product Page, Landing Page, or from a viral share.

- Retrieve lead form submissions and sync them to external systems (CRM, marketing automation).
- Supports field mapping for matching LinkedIn form fields to your system fields.
- Requires separate approval for the Lead Sync API product.

### Content & Creative Management

Create and manage ad creatives and the underlying content (posts) used in ads. Upload media assets (images, videos, documents) for use in ad creatives. Create "dark posts" (sponsored-only content not shown on the organization's page).

### Event Ads

Streamline event operations, amplify visibility, and drive meaningful connections within the professional landscape with Events APIs (Management & Ads). Create and promote LinkedIn events through advertising campaigns.

## Events

LinkedIn supports webhooks for certain event types, though availability is restricted to approved use cases.

### Organization Social Action Notifications

The Organization Social Actions Notifications API enables your app to notify members about activity on their LinkedIn Company Pages. Use this API to build real-time streams for activity on LinkedIn Company Pages.

- Receives notifications when users interact with Company Page posts (likes, comments, shares).
- The subscription request will only succeed if the subscribing member is an administrator of the organization being subscribed to.
- Requires webhook URL registration and validation via a challenge-response mechanism.
- Webhook endpoints will be periodically re-validated after the initial validation every 2 hours.
- Notifications are verified using the `X-LI-Signature` HMAC-SHA256 header.

### Lead Notifications

When a lead form is submitted, LinkedIn sends a JSON payload to your webhook URL in real time. Supported events: alerts are triggered for lead submissions (CREATED) and lead deletions (DELETED).

- Requires Lead Sync API access and a registered, validated webhook endpoint.
- Notifications contain entity URNs that must be resolved via additional API calls for full lead data.
