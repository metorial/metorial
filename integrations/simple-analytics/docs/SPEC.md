Now let me check the Stats API for available fields:# Slates Specification for Simple Analytics

## Overview

Simple Analytics is a privacy-focused web analytics platform that tracks website visitors without using cookies or trackers, requiring no visitor consent. It is a privacy-friendly and simple alternative to Google Analytics. Built and hosted in the EU, it provides page view analytics, visitor metrics, and event tracking through a JSON-based API.

## Authentication

Simple Analytics uses **API key authentication**. You can authenticate with an `Api-Key` header where the key starts with `sa_api_key_...`. In your account settings you can create this key.

There are two levels of authentication depending on the API being used:

1. **Stats API (read-only, aggregated data):** Only the `Api-Key` header is required. For this API, you need to be authenticated with an API key. If your website is public, you can get the JSON data without credentials.

2. **Export API and Admin API (raw data and account management):** Both the `Api-Key` and `User-Id` headers are required. The User-Id starts with `sa_user_id_...` and is found in your account settings.

**Required headers:**

| Header    | Format                                            | Required For                                        |
| --------- | ------------------------------------------------- | --------------------------------------------------- |
| `Api-Key` | `sa_api_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Stats API (private websites), Export API, Admin API |
| `User-Id` | `sa_user_id_00000000-0000-0000-0000-000000000000` | Export API, Admin API                               |

Both credentials are available in the [Simple Analytics account settings](https://simpleanalytics.com/account).

## Features

### Aggregated Statistics Retrieval

Retrieve the aggregated statistics as seen in the Simple Analytics dashboard. This helps integrate Simple Analytics into your systems — for example, to get KPIs out of your data or embed your data into a customized dashboard.

- Available fields include: pageviews, visitors, histogram (time-series data), pages, countries, referrers, UTM parameters (source, medium, campaign, content, term), browser names, OS names, device types, and median time on page.
- Data can be filtered by page path, country, referrer, UTM parameters, browser, OS, and device type.
- Filtering parameters support wildcard searches.
- Histogram data supports intervals of hour, day, week, month, or year.
- Date ranges support relative placeholders like `today`, `yesterday`, and `today-30d`.

### Event Counts

With events in Simple Analytics you can collect counts of certain events. For example, you can record a button click by firing an event.

- Query event totals for specific named events or use `events=*` to retrieve all events.
- Only alphanumeric characters and underscores are allowed in event names. Events are converted to lower case.
- Event names are limited to 200 characters.
- Events can include metadata with typed fields (text, date, bool, int).

### Raw Data Export

Export raw data points (without sampling). Data points are both page views and events combined. Define a date range and it pulls out the data. The response will only include the selected fields.

- Export formats include CSV and JSON.
- Data can be exported for specific hours of a day.
- Exportable fields include timestamps, paths, referrers, UTM parameters, browser/OS info, screen dimensions, country, scroll percentage, duration, and custom metadata fields.
- Data can be filtered to only page views or only events via the `type` parameter.

### Website Management

Manage websites tracked in your Simple Analytics account via the Admin API.

- List all websites associated with your account.
- Add new websites to your dashboard, specifying hostname, timezone, and public/private visibility.
- Assign custom labels to websites for organizational purposes.
- Adding websites requires a Business or Enterprise plan.

## Events

The provider does not support events. Simple Analytics does not offer webhooks, event subscriptions, or any purpose-built push notification mechanism through its API.
