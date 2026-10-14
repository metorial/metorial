# Plausible Analytics Specification

## Overview

Plausible Analytics is an open-source, privacy-friendly web analytics platform that serves as an alternative to Google Analytics. It tracks website visitors, pageviews, traffic sources, and goal conversions without using cookies. It offers both a hosted service (plausible.io) and a self-hosted option.

## Authentication

Plausible Analytics uses **API key-based authentication** via Bearer Token.

There are two types of API keys, each granting access to different APIs:

1. **Stats API Key**: Provides read-only access to query analytics data (Stats API).
2. **Sites API Key**: Provides access to change sites, goals, custom properties, shared links, and guest access (Site Provisioning API). Write operations are available on Enterprise plans. Stats API keys also work for read-only Site Provisioning endpoints on plans that include the Stats API.

Keys are scoped to the team selected when they are created. They do not inherit all sites their owner can view, including sites owned by other teams or sites where their owner is a guest.

To create an API key:

1. Log in to your Plausible Analytics account.
2. Click on your account name in the top-right menu and go to **Settings**.
3. Navigate to the **API Keys** section in the left-hand sidebar.
4. Click **New API Key**, choose either **Stats API** or **Sites API**, and save the key (it is only shown once).

Authenticate requests by including the key in the `Authorization` header:

```
Authorization: Bearer YOUR-KEY
```

**Base URL**: `https://plausible.io` (for cloud-hosted). Self-hosted instances use their own base URL.

**Site selection**: Analytics and site-specific provisioning requests use the registered website domain as `site_id` (e.g., `example.com`). Use `list_sites` to discover accessible domains and `list_teams` for team identifiers.

## Features

### Analytics Querying

Query historical and real-time website analytics data. Supports metrics such as visitors, pageviews, bounce rate, visit duration, views per visit, and revenue. Data can be filtered and broken down by dimensions including page, traffic source, referrer, country, region, city, device type, browser, OS, UTM parameters, and custom properties. Supports configurable date ranges (e.g., last 7 days, 30 days, custom ranges) and time-series output. Revenue metrics are available when revenue goals are configured.

- Queries can include multiple metrics and dimensions simultaneously.
- Filters support operators like `is`, `is_not`, `contains`, `has_done`, and `has_not_done` for session-level filtering.
- Segments can be used in filters for reusable audience definitions.
- Imported data (e.g., from Google Analytics) can optionally be included, though with some limitations on certain dimension/metric combinations.

### Event Ingestion

Send pageviews and custom events to Plausible programmatically via the Events API. Useful for server-side tracking, mobile apps, or environments where the JavaScript tracker cannot be used.

- Events require a `name` (use `pageview` for page views, or any custom string for custom events) and a `url`.
- Optional fields include `referrer`, custom properties (props), and revenue data.
- The `User-Agent` and `X-Forwarded-For` headers are used for visitor identification and geolocation when sending from a server.
- No API key is required for the Events API.
- Set `interactive` to false for custom events that should not affect bounce detection.
- HTTP 202 acceptance does not guarantee recording. The `dropped` output exposes the provider's bot-filtering rejection header; use the actual visitor's IP and User-Agent for server-side tracking.

### Site Management

Programmatically create, update, retrieve, list, and delete sites in your Plausible account. Useful for agencies or platforms managing analytics for multiple websites.

- Configure tracker script settings per site (e.g., outbound link tracking, file downloads, form submissions, 404 page tracking, hash-based routing, revenue tracking).
- Change the domain name of an existing site.
- Write operations require an Enterprise Sites API key; read operations also support Stats API keys.
- `get_tracker_installation` resolves a site's tracker ID to its documented script URL and returns the configured tracking features.

### Goal Management

Create, list, and delete goals (conversion tracking) for a site. Goals can be either pageview goals (triggered when a specific page path is visited) or custom event goals (triggered when a named event fires).

- Pageview goals support wildcard paths.
- Custom event goals can be narrowed down by specific custom property values.
- Each custom property supports one string value per goal. The existing `customProps` array input is preserved; supply a single value in each array. Multiple allowed values cannot be represented by the provider's goal API.
- Goals can have custom display names for the dashboard.

### Custom Property Management

Create, list, and delete custom properties for a site. Custom properties allow capturing additional metadata with events (e.g., author, category, logged-in status).

### Shared Link Management

Create shared links for a site to enable public or embedded dashboard access. Shared links can be named and are idempotent (re-requesting an existing link returns it rather than creating a duplicate).

### Guest Access Management

List, invite, and remove guest users for a site. Guests can be assigned either a `viewer` or `editor` role.

### Team Management

List teams associated with your account and check whether API access is available for each team. Sites can be scoped by team.

### Service Health

Use `check_api_health` to inspect instance readiness and its returned component details when troubleshooting tracking or query failures. This check does not verify API key access.

## Events

The provider does not support events. Plausible Analytics does not offer webhooks or any built-in event subscription mechanism. A community feature request for webhook support exists but has not been implemented.
