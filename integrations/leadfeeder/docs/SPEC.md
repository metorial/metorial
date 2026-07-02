# Slates Specification for Leadfeeder

## Overview

Leadfeeder (now part of Dealfront) is a B2B website visitor identification tool that tracks which companies visit your website and how they interact with your content. It provides company-level data including industry, employee count, location, and visit behavior to support B2B sales pipelines. It also offers an IP-Enrich API for resolving IP addresses to company information.

## Authentication

Leadfeeder provides two separate APIs, each with its own authentication method:

### Leadfeeder API (main API)

- **Method:** API Token (Bearer-style token in header)
- **Base URL:** `https://api.leadfeeder.com`
- The API expects a token to be included in all requests via the `Authorization` header in the format: `Authorization: Token token=yourapitoken`.
- Your API key is available in Personal settings under API tokens, or generated at `https://app.leadfeeder.com/l/settings/personal/api-tokens`.
- A working Leadfeeder Trial or Premium account is required.

### IP-Enrich API

- **Method:** API Key in header
- **Base URL:** `https://api.lf-discover.com`
- Authentication is via the `X-API-KEY` header.
- This is a separate API key from the main Leadfeeder API token.

## Features

### Account Management

Retrieve the list of Leadfeeder accounts accessible by the authenticated user. Each account represents a tracked website and includes details such as subscription type, timezone, and website tracking status (whether the tracker is installed and reporting correctly).

### Lead Retrieval

Access identified companies (leads) that have visited your website within a specified date range. Lead data includes company name, industry, website URL, employee count, revenue estimate, location (country, region, city), social profiles (LinkedIn, Twitter, Facebook), phone number, CRM IDs, tags, quality score, assignee, and visit count. Leads can be filtered by custom feed.

- Requires `start_date` and `end_date` parameters.
- Can optionally filter by `custom_feed_id`.
- Results are capped at 10,000 leads.

### Custom Feeds

Retrieve user-defined custom feeds (filtered views of leads). Custom feeds define criteria such as page URL filters, country codes, industry codes, assignee status, and pageview thresholds. Built-in feeds include "All leads", "New leads", "Top leads", and "Followed companies".

### Visit Tracking

Access detailed visit data for a specific lead or across all leads within a date range. Visit data includes traffic source, medium, campaign, referring URL, landing page, full page-by-page visit route (with time on each page), visit duration, keyword data, device type, and identified visitor information (email, name) when available. Also includes Google Analytics client IDs and Adobe cookie data if applicable.

### Feed Export

Request bulk exports of lead data for a given account and feed over a date range. Exports are asynchronous: you submit an export request, poll for status, and download the resulting report once processed. The report includes lead details, visit statistics, quality scores, and keywords.

### Website Tracking Script

Retrieve the JavaScript tracking script for a given account, which needs to be installed on webpages to enable visitor identification.

### IP-Enrich (Separate API)

The IP-Enrich API allows you to uncover company information related to an IPv4 or IPv6 address. Returned data includes company name, domain, industry, employee range, revenue, social profiles, business IDs, location, and a confidence score.

## Events

The provider does not support webhooks or event subscriptions through its API. There is no native webhook or push-based event mechanism documented in the Leadfeeder API.
