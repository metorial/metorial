# Slates Specification for Fluxguard

## Overview

Fluxguard is an AI-powered web change monitoring platform that detects, filters, and summarizes changes to websites. It monitors text, HTML, visual/pixel, and network activity changes for use cases like regulatory compliance, competitive intelligence, defect detection, and brand protection.

## Authentication

Fluxguard uses **API key** authentication.

- You can create a new API key in your org settings.
- The key can then be used to access your account by using API endpoints under `https://api.fluxguard.com`. Add your API key as the `x-api-key` header of your request.
- API keys can be removed at any time in org settings, and then will no longer function.

**Example request:**

```
curl -H 'x-api-key: YOUR_API_KEY' https://api.fluxguard.com/account
```

No OAuth, scopes, or additional credentials are required.

## Features

### Page Monitoring Management

Add web pages for monitoring by providing a URL. Pages are organized within sites and sessions. You can optionally specify a siteId and sessionId to add the page to an existing site and session. New pages can be assigned to categories and given nicknames. You can add numerous sessions per site; a session can be regarded as a discrete user flow through a site, such as registering a user or ordering a product.

### Crawl Initiation

Trigger on-demand crawls of monitored sessions via the API. You can decide the crawl's frequency (every 5 minutes, every day, etc.). Fluxguard uses a full headless Chrome browser for crawling, so all JavaScript, CSS, and images are loaded and executed.

### Page Data Retrieval

Retrieve captured data for any monitored page, including change details. Fluxguard records a complete analysis of all changes, including HTML, text, pixel screenshots, network activity, headers, cookies, extracted entities, and more.

### Category Management

Organize monitored sites into custom categories. You can create new site categories and list all existing categories in your account.

### Site and Page Deletion

Delete sites (along with all their sessions, pages, and captured versions) or delete individual pages and their captured versions.

### Webhook Management

Create, list, and delete webhook endpoints via the API. You can also fetch a sample webhook payload to preview the data format before setting up integrations.

### Change Detection Filters

Fluxguard's Inclusion and Exclusion Filters allow you to select which parts of a web page you would like to monitor for changes. You can choose to monitor the entire page, or just certain parts of it. You can also specify which areas you would like to exclude from monitoring, such as sidebar content or ads. You can enter a list of keywords and phrases and Fluxguard will announce when they are added or deleted to any monitored page. You can also create an Ignore Keywords list to exclude phrases from change monitoring.

### AI-Powered Change Analysis

Fluxguard's generative AI elevates web change analysis by filtering noise and zeroing in on crucial data. This crisp AI processing minimizes false positives and streamlines complex change details into targeted summaries. You can craft domain-specific AI prompts for your industry or use case.

## Events

Fluxguard supports webhooks that push change data to a configured endpoint when changes are detected.

### Web Page Change Detected

Whenever Fluxguard detects a modification, it will push variation details to any web endpoint you desire. These alerts will include a full package of change data. This JSON package includes a detailed set of changes, including AWS S3 locations for version-specific and difference-particular screenshots, HTML, and more. As this data can be voluminous, the contents of these files are not included in the JSON; rather, it references their S3 locations.

- You can configure the webhook URL in Account Settings or via the API.
- You can limit when Fluxguard pushes to the webhook endpoint.
- Each webhook URL has an associated secret key, which can be used to authenticate the data and guard against malicious actors sending false webhooks to your server. Verification uses HMAC SHA-256 signing via the `fluxguard-signature` header.
