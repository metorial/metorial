# Slates Specification for Google Search Console

## Overview

Google Search Console is a free Google service that allows website owners to monitor their site's presence in Google Search results. It provides data on search traffic performance (clicks, impressions, CTR, position), indexing status, sitemaps, and URL-level diagnostics. It provides tools that let webmasters test whether a page is indexed, how it is rendered and other traffic metrics like clicks, impressions, click-through-rate and position in Google.

## Authentication

Applications interacting with the Google Search Console API must use OAuth 2.0 for authorization. This involves registering the application with Google to obtain a client ID and secret.

**Setup steps:**

1. Create a project in the Google Cloud Console.
2. Enable the Google Search Console API for the project.
3. Create OAuth 2.0 credentials (client ID and client secret).
4. Configure the OAuth consent screen.

**OAuth 2.0 Flow:**

- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token endpoint: `https://oauth2.googleapis.com/token`
- Applications request specific data access scopes, users grant consent, and then a short-lived access token is issued. The application then uses this token to request data.
- Some flows include additional steps, such as using refresh tokens to acquire new access tokens.

**Scopes:**

For the Google Search Console API, use the following scopes:

- `https://www.googleapis.com/auth/webmasters` — read/write access
- `https://www.googleapis.com/auth/webmasters.readonly` — read-only access

**Service Accounts:**

You can generate OAuth 2.0 credentials for web applications, service accounts, or installed applications. Service accounts can be used for server-to-server access. The service account email must be added as a user on the relevant Search Console property.

**API Keys:**

Requests to the Search Console Testing Tools API for public data must be accompanied by an identifier, which can be an API key or an access token. API keys are only applicable for public data endpoints (e.g., Mobile-Friendly Test), not for accessing private Search Console property data.

## Features

### Search Analytics

Search Analytics exposes a single endpoint allowing you to query search traffic data on your site. You can retrieve metrics including clicks, impressions, CTR, and average position. The API supports filtering, sorting, aggregation type, and all other features available in the reports.

- Data can be grouped by query, page, country, device, search type, and date.
- You must define a date range of one or more days. When date is one of the group by values, any days without data are omitted from the result list.
- Search types include web, image, video, and news.
- Performance report data is limited to 50K rows of data per day per type (web, news, image, and so on) per property.

### Site Management

The Sites service lets you add, remove, retrieve, and list the sites you have in your Search Console. The site URL can be either a URL-prefix (e.g., `http://www.example.com/`) or a domain property (e.g., `sc-domain:example.com`).

### Sitemap Management

The four methods in this service allow you to list, retrieve, delete, or submit new sitemaps for your site.

- Deleting a sitemap from the Sitemaps report does not stop Google from crawling this sitemap or the URLs that were previously crawled in the deleted sitemap.
- You can also list sitemaps included in a sitemap index file.

### URL Inspection

You can request the data Search Console has about the indexed version of a URL; the API will return the indexed information currently available in the URL Inspection tool.

- The response includes analysis results containing information from Search Console, including index status, AMP, rich results, and mobile usability.
- Presently only the status of the version in the Google index is available; you cannot test the indexability of a live URL.
- Request parameters include the inspection URL, the site URL (property), and an optional language code.
- This doesn't submit the URLs for indexing – it only checks their current indexing status and related data.

### Mobile-Friendly Test (Testing Tools)

Runs Mobile-Friendly Test for a given URL. This is a public endpoint that does not require OAuth — it can be accessed with just an API key. It checks whether a given URL is mobile-friendly according to Google's standards.

## Events

These features are not specifically for the Google Search Console API. If you need real-time updates from Google Search Console, you may need to explore alternative solutions or periodically poll the API for changes.

The provider does not support events. Google Search Console does not offer webhooks, event subscriptions, or any built-in push notification mechanism for data changes.
