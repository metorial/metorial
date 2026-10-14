# Leadfeeder API Specification

## Overview

Leadfeeder is a B2B website visitor identification tool that tracks which companies visit your website and how they interact with your content. It provides company-level data including industry, employee count, location, and visit behavior to support B2B sales pipelines. It also offers an IP-Enrich API for resolving IP addresses to company information.

## Authentication

Leadfeeder provides two separate APIs, each with its own authentication method:

### Leadfeeder legacy API (main API)

- **Method:** Existing legacy API token in the Authorization header
- **Base URL:** `https://api.leadfeeder.com`
- The API expects a token to be included in all requests via the `Authorization` header in the format: `Authorization: Token token=yourapitoken`.
- Existing legacy API tokens remain supported; new legacy tokens are no longer issued. Newly issued keys for the current `/v1` API use a different authentication header and do not work with these tools.
- Some endpoints require an eligible Leadfeeder subscription and account access.

### Legacy IP-Enrich API

- **Method:** API Key in header
- **Base URL:** `https://api.lf-discover.com`
- Authentication is via the `X-API-KEY` header.
- This is a separate existing legacy API key from the main token. New legacy IP-Enrich keys are no longer issued.

## Features

### Account Management

Use `get_accounts` to discover accessible account IDs and `get_account` to retrieve a specific tracked website account. Each account represents a tracked website and includes details such as subscription type, timezone, and website tracking status (whether the tracker is installed and reporting correctly).

### Lead Retrieval

Access identified companies (leads) that have visited your website within a specified date range. Lead data includes company name, industry, website URL, employee count, revenue estimate, location (country, region, city), social profiles (LinkedIn, Twitter, Facebook), phone number, CRM IDs, tags, quality score, assignee, and visit count. Leads can be filtered by custom feed.

- Requires `start_date` and `end_date` parameters.
- Can optionally filter by `custom_feed_id`.
- Results are capped at 10,000 leads.

### Custom Feeds

Use `get_custom_feeds` to retrieve available custom feeds and `get_custom_feed` to inspect a selected feed (filtered view of leads). Custom feeds define criteria such as page URL filters, country codes, industry codes, assignee status, and pageview thresholds. Built-in feeds include "All leads", "New leads", "Top leads", and "Followed companies".

### Visit Tracking

Access detailed visit data for a specific lead or across all leads within a date range. Visit data includes traffic source, medium, campaign, referring URL, landing page, full page-by-page visit route (with time on each page), visit duration, keyword data, device type, and identified visitor information (email, name) when available. Also includes Google Analytics client IDs.

### Feed Export

Request bulk exports of lead data for a given account and feed over a date range. Exports are asynchronous: you submit an export request, poll for status, and download the resulting report once processed. The report includes lead details, visit statistics, quality scores, and keywords. `get_export_status` supplies a downloadable JSON report when processed, and `download_export` retrieves a completed export without starting a new one. The original provider download URL remains in the output. Completed download URLs do not require authentication; the provider does not document their expiration.

### Website Tracking Script

Retrieve the JavaScript tracking script for a given account, which needs to be installed on webpages to enable visitor identification.

### IP-Enrich (Separate API)

The IP-Enrich API allows you to uncover company information related to an IPv4 or IPv6 address. Returned data includes company name, domain, industry, employee range, revenue, social profiles, business IDs, location, and a confidence score.

## Response compatibility

Industry objects are returned as industry name strings. Numeric CRM and visitor IDs are returned as strings. IP-Enrich revenue and employee counts are converted from provider numeric strings to the existing numeric output fields. `employeeRangeBounds` preserves nullable and open-ended employee bounds; the original `employeesRange` remains nullable and only contains a range when both bounds are numeric.

## Official documentation

- [Legacy Leadfeeder API](https://docs.leadfeeder.com/api/)
- [Legacy IP-Enrich API](https://docs.leadfeeder.com/connectors/ip-enrich-api/)
- [Current API credential format](https://help.leadfeeder.com/en/articles/14625032-how-to-create-and-use-your-leadfeeder-api-keys)
