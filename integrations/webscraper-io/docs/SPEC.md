# Slates Specification for Webscraper io

## Overview

Web Scraper (webscraper.io) is a web scraping platform offering a Chrome browser extension and a cloud-based service (Web Scraper Cloud) for extracting structured data from websites. It allows users to export data in CSV, XLSX, and JSON formats, access it via API and webhooks, or export to services like Dropbox, Google Sheets, and Amazon S3.

## Authentication

Web Scraper Cloud uses **API token** authentication. Users can visit https://cloud.webscraper.io/api to acquire their API key.

The API token is passed as a query parameter on every request:

```
https://api.webscraper.io/api/v1/<endpoint>?api_token=<YOUR API TOKEN>
```

There are no OAuth flows, scopes, or additional credentials required. The single API token provides full access to all API capabilities tied to the user's account.

## Features

### Sitemap Management

Sitemaps define the structure and rules for scraping a website, including start URLs and CSS selectors for data extraction. The API allows creating, retrieving, updating, listing, and deleting sitemaps. Each sitemap includes a name, one or more start URLs, and a tree of selectors (text, link, image, table, HTML, element, click, pagination, etc.) that define what data to extract. Sitemaps can be filtered by tag when listing.

### Scraping Job Execution

Users can create scraping jobs to execute a sitemap and extract data from the target website. Key configuration options include:

- **Driver**: `fast` (skips JavaScript) or `fulljs` (executes JavaScript on pages).
- **Proxy**: Choice of datacenter or residential proxies across many countries.
- **Page load delay and request interval**: Controls timing between requests.
- **Start URL overrides**: Optionally override the sitemap's start URLs for a specific job.
- **Custom ID**: An optional identifier included in webhook notifications for tracking.

Jobs go through statuses: waiting, scheduling, scheduled, started, finished, failed, or stopped.

### Scraping Job Monitoring and Data Quality

Users can retrieve the status and statistics of scraping jobs, including counts of scheduled, executed, failed, and empty pages. A dedicated data quality endpoint reports whether the scraped data meets configurable thresholds for minimum record count, maximum failed/empty page percentages, and minimum column fill rates. Problematic URLs (empty, failed, or no-value) can also be retrieved per job.

### Data Download

Scraped data from completed jobs can be downloaded in JSON or CSV format.

### Scheduler

Sitemaps can be configured with a cron-based scheduler to run scraping jobs automatically at specified intervals. The scheduler supports full cron expression configuration (minute, hour, day, month, weekday), timezone settings, and the same driver/proxy/timing options as manual scraping jobs. Schedulers can be enabled, disabled, and retrieved per sitemap.

### Account Information

Users can retrieve account details including email, name, and remaining page credits.

## Events

### Scraping Job Completion Webhook

Web Scraper Cloud can notify your server when a scraping job has finished. You configure a URL on your server which will receive notifications from Web Scraper Cloud when a scraping job finishes.

- Web Scraper will send the notification only once the job has been finished, stopped, or failed.
- The webhook delivers a POST request containing: `scrapingjob_id`, `status` (finished/stopped/failed), `sitemap_id`, `sitemap_name`, and `custom_id`.
- Your server must respond with a 2xx HTTP status code within 10 seconds. On failure or timeout, the notification is retried with increasing delays.
- A new notification is also sent when data extraction from empty/failed URLs has been rescheduled (e.g., via the "Continue" action).
- The webhook endpoint URL is configured in the Web Scraper Cloud API settings page. Security can be handled by including a secret token in the webhook URL.
