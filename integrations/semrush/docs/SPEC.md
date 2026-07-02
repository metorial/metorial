Now let me get more details on the specific API features available:Now I have enough information to write the specification.

# Slates Specification for Semrush

## Overview

Semrush is an online visibility management and digital marketing SaaS platform. It provides data and tools for SEO, PPC, content marketing, competitor analysis, backlink analysis, keyword research, traffic analytics, and local listing management. The API exposes programmatic access to Semrush's databases across two main versions (v3 and v4).

## Authentication

Semrush supports two authentication mechanisms depending on the API version:

### API Key (v3 — Standard API and Trends API)

Your API key lets you send requests through the Semrush API. To find your API Key, go to the API Units tab on the Subscription Info page. The key is passed as a query parameter in each request:

```
https://api.semrush.com/?key=YOUR_API_KEY&type=domain_ranks&domain=example.com&database=us
```

The API key is tied to your subscription and API unit balance. This API is available as an add-on to the Business tier of the SEO Toolkit subscription.

### OAuth 2.0 (v4 — Projects, Listing Management, Map Rank Tracker)

Semrush API supports authorization with the OAuth 2.0 flow. The token is passed as a Bearer token in the `Authorization` header.

Two OAuth 2.0 grant types are supported:

**1. Device Authorization Grant (recommended)**

This flow lets you, as an app or service developer, sign in with your own Semrush account so that your app can get Semrush API v4 data. This way, you can display the data from Semrush to your end-users without requiring those end-users to have Semrush accounts.

- Request a device code: `POST https://oauth.semrush.com/dag/device/code`
- User opens the returned `verification_uri` in a browser and approves access.
- Poll for tokens: `POST https://oauth.semrush.com/dag/device/token` with `grant_type=urn:ietf:params:oauth:grant-type:device_code` and the `device_code`.

**2. Semrush Auth (Authorization Code flow)**

- Contact the Semrush Tech Support to obtain your `client_id` and `client_secret`.
- Authorize URL: `https://oauth.semrush.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=user.id`
- Exchange code for token: `POST https://oauth.semrush.com/oauth2/access_token` with `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, and `redirect_uri`.
- Refresh tokens: `POST https://oauth.semrush.com/oauth2/access_token` with `grant_type=refresh_token`.

**Token lifetimes:** Access tokens expire in 7 days. Refresh tokens are valid for 30 days and are refreshed along with the bearer token.

**Known scopes:** `user.id`, `domains.info`, `url.info`, `positiontracking.info` (scopes may vary by integration).

## Features

### Domain Analytics

Retrieve comprehensive SEO and PPC data for any domain, subdomain, subfolder, or URL. Pull data on domains including traffic, keywords, backlinks, etc. This includes organic and paid search keyword rankings, ad copies, competitor identification, domain overview reports (live and historical), PLA (Product Listing Ads) data, and domain-vs-domain comparison. Data can be filtered by one of Semrush's regional databases (e.g., `us`, `uk`, `de`).

### Keyword Research

Retrieve keyword data like search volume, difficulty, CPC, etc. Available reports include keyword overview (single or batch, across one or all databases), organic and paid SERP results for a keyword, related keywords, broad match keywords, phrase questions, and keyword difficulty scores. Supports filtering by database/country.

### Backlink Analytics

This report provides a summary of backlinks, including their type, referring domains, and IP addresses for a domain, root domain, or URL. Includes data on referring domains, referring IPs, TLD distribution, referring domains by country, anchor texts, indexed pages, backlink competitors, domain comparison, authority score profiles, categories, and historical backlink data.

### Traffic & Market Intelligence (Trends API)

The Trends API is a powerful website traffic API that delivers a robust dataset on web traffic and market dynamics. Unlike the Standard API, which focuses on tactical SEO and PPC data, the Trends API delivers strategic insights. Available reports include traffic summaries, daily/weekly traffic, geo distribution, traffic sources and destinations, top pages, subdomains, subfolders, traffic rank, audience insights, purchase conversion, audience demographics (age, sex, household, income, education, occupation), audience interests, and social media preferences. Supports analyzing up to 200 domains per request for summary reports. Requires a separate Trends API subscription (Basic or Premium tiers).

### Project Management

Project API lets you get basic information about your Semrush projects, as well as perform some basic management actions (create, update, delete a project). Available via API v4 with OAuth 2.0. Requires SEO Business subscription.

### Position Tracking

Set up and manage position tracking campaigns within projects. You can create campaigns, add/remove keywords and competitors, manage keyword tags, and retrieve organic and paid position reports, visibility index data, landing page reports, and competitor discovery reports. Supports tracking by specific locations and search engines.

### Site Audit

Run and manage site audit campaigns within projects. You can enable audits, edit campaign settings, trigger audit runs, retrieve snapshots, get issue descriptions and detailed issue reports, and look up individual page information. Useful for identifying technical SEO issues on a website.

### Listing Management

Listing Management API allows you to push data from your tools into Semrush Listing Management in bulk and distribute it across directories in seconds. You can retrieve and update business location data (name, address, hours, categories, etc.) individually or in bulk. Available via API v4; requires a Semrush Local Pro or Business plan. Does not consume API units.

### Map Rank Tracker

The Map Rank Tracker API lets you access critical data related to your campaigns, keywords, and competitors. Retrieve campaign details, keyword ranking statuses, heatmap data, performance metrics, and top competitors for local map pack rankings. Available to all Semrush users without requiring API units.

## Events

The provider does not support events. The search results do not provide any information about SEMrush offering webhooks or the types of events you can subscribe to. Semrush does not offer native webhooks or built-in event subscription mechanisms through its API.
