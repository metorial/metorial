I see that "Later" (later.com) is a social media scheduling platform, and the search results are getting mixed with "Late" (getlate.dev) which is a different product. Let me focus specifically on Later (later.com) and its API capabilities.Let me get more details on the Later Influence API integrations and check the Swagger documentation.Based on my research, I can now see that Later (later.com) is primarily a social media management and influencer marketing platform. The main API it exposes is the **Later Influence Reporting API** (formerly Mavrck). Later's core social media scheduling product does not have a public API for third-party developers. Let me confirm this and check for any additional API details.Now I have a comprehensive picture. Later (later.com) is a social media management and influencer marketing platform. Its core social media scheduling product (Later Social) does not offer a public API. The only API available to developers is the **Later Influence Reporting API** (formerly under the Mavrck brand), which is focused on retrieving influencer campaign analytics data. The API is hosted at `api.mavrck.co` and uses JWT-based authentication.

# Slates Specification for Later

## Overview

Later is a social media management and influencer marketing platform comprising Later Social (scheduling and publishing to Instagram, Facebook, TikTok, LinkedIn, Twitter/X, and Pinterest) and Later Influence (influencer campaign management, formerly Mavrck). The only developer-facing API available is the Later Influence Reporting API, which provides programmatic access to influencer campaign performance data for integration with external reporting and analytics tools.

## Authentication

Authentication is handled by JWT (JSON Web Tokens), where clients must exchange their `clientId` and `clientSecret` for a token.

Contact your Account Manager to get your `clientId` and `clientSecret`. These credentials are not self-service and must be provisioned by Later.

**Steps:**

1. Obtain your `clientId` and `clientSecret` from your Later Account Manager.
2. Use the `/oauth/token` route to retrieve a JWT based on the `clientId` and `clientSecret`. The token endpoint is `POST https://api.mavrck.co/oauth/token` with a JSON body containing `clientId` and `clientSecret`.
3. Use the returned JWT as a Bearer token in the `Authorization` header for all subsequent API requests.

**Base URL:** `https://api.mavrck.co`

All routes require the `v1/reporting-api` prefix.

## Features

### Instance Information

Retrieve metadata about the Later Influence community (instance) associated with your credentials. This allows you to confirm which program your credentials are linked to before pulling campaign data.

### Campaign Listing

Retrieve campaigns associated with the community linked to the supplied credentials, with the ability to filter results by campaign ID. Returns campaign details including ID, status, start/end dates, title, and description.

### Reporting Group Management

Retrieve information about reporting groups, allowing filtering by reporting group ID and campaign ID. Reporting groups allow you to aggregate data across related campaigns.

### Campaign Performance Reporting

Programmatically retrieve detailed analytics and performance data, including metrics on campaign performance, influencer performance, and reporting data aggregation.

- Report on either a campaign or a reporting group by setting the campaign ID or reporting group ID. The API returns all metrics, including content totals, impressions, and engagements by network type.
- Filter by date range using start and end dates. Data can be grouped by year, quarter, month, week (starting Monday), week (starting Sunday), or day using the `groupBy` field.
- The report includes additional affiliate data such as clicks, conversions, and conversion value.
- Metrics are broken down by social network (Facebook, Instagram, TikTok, Pinterest) and content type (posts, stories, reels, lives).
- Designed for integration with third-party reporting dashboards and analytical tools like Looker, Microsoft BI, Oracle Analytics Cloud, SAP Analytics Cloud, and Tableau.

**Limitations:**

- There is no public API for Later's core social media scheduling product (Later Social). The API is limited to the Later Influence (campaign reporting) product.
- API access requires an enterprise Later Influence subscription and credentials must be provisioned by an Account Manager.

## Events

The provider does not support events. The Later Influence Reporting API is a read-only reporting interface with no webhook or event subscription capabilities.
