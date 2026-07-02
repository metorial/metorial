# Slates Specification for DataForSEO

## Overview

DataForSEO is an API-first platform that provides SEO, SEM, ecommerce, business, app, content, and AI optimization data. This integration exposes a practical DataForSEO API v3 surface for common Slates workflows rather than every endpoint in the catalog.

## Authentication

DataForSEO uses Basic Authentication.

Your unique API token should be passed in the `Authorization` header within the request in the following format: `Authorization: Basic login:password`. Instead of "login" and "password", use your API credentials encoded in Base64.

Your API login is the same as the email address you use to create an account with DataForSEO. The API password is generated automatically by DataForSEO and is different from your account password. You can find your API login and password in the API Access section of the Dashboard.

Basic authentication is the only way to access DataForSEO API; credentials should always be passed in the header of the request.

**Base URL:** `https://api.dataforseo.com/`

**Example header:**

```
Authorization: Basic bG9naW46cGFzc3dvcmQ=
```

Where `bG9naW46cGFzc3dvcmQ=` is the Base64-encoded string of `login:password`.

## Features

### SERP Data

Retrieve organic live advanced results for Google, Bing, Yahoo, and YouTube by keyword, location, language, device, and OS.

### Keyword Data

Obtain Google Ads keyword metrics including search volume, CPC, competition, and monthly trends. The Keywords For Site endpoint relies on Google Ads data and DataForSEO's proprietary SERP database to provide keywords that are relevant to the target domain.

### DataForSEO Labs (Keyword & Domain Intelligence)

DataForSEO Labs API provides keyword and domain intelligence based on in-house databases. Implemented tools include keyword suggestions, related keywords, ranked keywords, competitor domain analysis, domain rank overview, and domain intersection.

### Backlinks

Backlinks API provides real-time structured backlink data on virtually any domain, subdomain, or page on the web, including all relevant link, referring page and domain properties. Features include backlink summaries, anchor analysis, historical backlink data (back to 2019), referring domains/networks, and link intersection (gap analysis) to find domains linking to competitors.

### On-Page (Site Audit)

Customizable website crawler with JavaScript rendering support, designed for running technical audits at scale and powering on-page SEO tools. The integration can create OnPage crawl tasks and retrieve summary or page-level results for completed tasks.

### Domain Analytics

Domain Analytics Whois API offers Whois data enriched with backlink stats, and ranking and traffic info from organic and paid search results. Domain Analytics Technologies API identifies all possible technologies used for building websites, allowing reviewing stats by domain and by technology name, category or group.

### Business Data

Implemented Business Data coverage includes Business Listings live search and Google Reviews task creation. Business Listings supports category, title, description, location, pagination, filters, and ordering.

### Merchant (Ecommerce)

Implemented Merchant coverage includes Google Shopping product tasks plus Amazon products and Amazon ASIN task creation. Task results can be retrieved through the documented task result endpoint enum.

### App Data

Implemented App Data coverage includes Google Play app search, app info, and app reviews task creation.

### Content Analysis

Content Analysis API ensures brand monitoring solutions can quickly search for brand mentions and keyword citations across the web and get all the related data in real-time. It provides a sophisticated sentiment analysis algorithm and includes citation statistics, trends by category, and rating distributions.

### AI Optimization

AI Optimization API provides data for keyword discovery, conversational optimization, and real-time LLM benchmarking. Implemented coverage includes AI keyword search volume, LLM Mentions Search for Google AI Overview and ChatGPT mention data, and live LLM Responses for ChatGPT, Claude, Gemini, and Perplexity.

### Data Retrieval Methods

DataForSEO has two main methods to deliver results: Standard and Live. This integration uses Live endpoints where immediate results are practical, and creates Standard tasks for APIs such as OnPage, Merchant, App Data, and Google Reviews where task-based retrieval is the documented workflow.

## Implemented Tools

- `serp_search`
- `keyword_research`
- `keywords_for_site`
- `keyword_suggestions`
- `backlinks_analysis`
- `domain_analytics`
- `domain_competitors`
- `domain_intersection`
- `ranked_keywords`
- `on_page_audit`
- `on_page_results`
- `content_analysis`
- `google_shopping_search`
- `amazon_product_search`
- `app_data`
- `business_data`
- `ai_optimization`
- `get_task_result`

## Live E2E

Live E2E coverage exists under `tests/integrations/dataforseo/tools.e2e.ts`. It uses minimal public inputs because DataForSEO charges for live and task-based API calls.

```bash
bun run tools:e2e -- dataforseo --profile <profile>
```

## Events

DataForSEO supports task completion notifications via two callback mechanisms: pingbacks and postbacks.

### Task Completion Pingback

The pingback function is a notification sent to your server upon the completion of a task. When setting a task, you specify a `pingback_url` parameter. Upon completion, DataForSEO sends a GET request to that URL with the task ID substituted into the URL. You can then use the task ID to retrieve results via the Task GET endpoint.

- Configurable parameters: `pingback_url` (with `$id` and `$tag` variable placeholders).

### Task Completion Postback (Webhook)

Postback is referred to as a webhook or HTTP push. The postback function actually sends the results to your server. When setting a task, you specify a `postback_url` parameter, and DataForSEO delivers the full task results directly to your server upon completion.

- Configurable parameters: `postback_url`, the data retrieval function (e.g., `advanced` or `html`).
- Tasks set with the `postback_url` parameter will not be provided in the list of completed tasks by the Tasks Ready endpoint.
- In case of delivery issues, you can resend webhooks using the Webhook Resend endpoint for up to 100 task IDs.
