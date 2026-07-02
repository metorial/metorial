Now let me get more details on the webhook integration and change detection features.# Slates Specification for Agenty

## Overview

Agenty is a cloud-based SaaS platform for automated web data extraction, web scraping, website change detection, and web crawling. It provides agents for data scraping, text extraction, text classification, OCR, categorization, change tracking, and sentiment analysis to help convert unstructured data into structured, machine-readable data. It also offers a browser automation API for repetitive web-based tasks, including scraping content, capturing screenshots, generating PDFs, and executing custom Puppeteer/Playwright functions.

## Authentication

Agenty uses API key-based authentication. Once logged in, go to the Settings page and then the API keys page to get your API key token.

The API key can be provided in one of two ways:

1. **Query parameter**: Append `apikey=xxxxxxx` to each API request URL.
2. **Request header**: Add the header `X-Agenty-ApiKey: {Your Key Here}` on each request.

The root endpoint of the Agenty API is `https://api.agenty.com/v2`.

The API supports managing multiple API keys per account — you can create, reset, update, and delete API keys through the API keys management endpoints. This allows generating separate keys for different use cases or team members.

## Features

### Agent Management

Create, retrieve, clone, and delete scraping agents. Agents can initially be created using the Chrome extension and then modified via the API or the scraping agent editor at cloud.agenty.com. Scraping agents can be configured with options for JavaScript rendering, CSS selectors, JSONPath queries, regex patterns, pagination handling, and detail page navigation.

### Web Scraping

The web scraping API is asynchronous and handles automatic proxy rotation, headless browsers, and captcha solving, with advanced configuration like pagination, fail-retries, and login to extract any number of fields. You can provide URLs manually, attach a list, or chain the output of another agent as input. Extracted data can be exported in formats like JSON, CSV, or TSV.

### Website Change Detection

Monitor web pages for content changes on a schedule. You can select specific areas of a page to watch, configure keyword monitoring for specific terms appearing or disappearing, capture full-page screenshots with highlighted differences for visual comparison, and receive alerts when changes are detected. Scheduling can range from every 5 minutes to daily, or via custom CRON expressions.

### Job Management

Start and stop scraping/monitoring jobs, check job status, retrieve job results and logs, and export job results. After starting an agent job, its progress can be tracked, including job status, total inputs processed, and progress percentage.

### Scheduling

Agents can be started manually or scheduled to run automatically on a particular time or day. Schedules can be created and deleted via the API.

### Input Management

The Inputs API manages the input configuration of a particular agent — you can add input URLs, attach a list, or set a source agent reference as input. This enables chaining agents together, where one agent's output feeds into another's input.

### Lists Management

Create, read, update, and delete reusable lists of URLs or data that can be attached to agents as input sources. Lists are useful for managing large sets of URLs across multiple agents.

### Team Management

You can invite team members to join your account with role-based security. Roles include Admin, Manager, or Viewer, defining the level of access to your account, its settings, projects, agents, and data.

### AI-Powered Extraction

Extract data from websites automatically with AI or build web scraping agents for bulk URL scraping. The AI extraction can auto-detect and extract structured data such as product listings, job postings, and SEO metadata from given URLs without manual selector configuration.

### Browser Automation

Perform browser-based tasks such as capturing screenshots, generating PDFs from URLs, retrieving rendered HTML content, and executing custom Puppeteer or Playwright scripts.

## Events

Agenty supports a webhook integration that can be configured as a plugin on each agent. Integrations automatically transfer Agenty data when an agent job has been completed — you can upload agent results to your own servers via webhook.

### Job Completion Webhook

When an agent job completes, Agenty sends an HTTP POST request to the configured webhook URL with the job results. Agenty recommends using the webhook plugin for automatic data transfer to your server instead of continuously polling the job status API.

- The webhook URL is configured per agent through the integrations/plugins settings.
- Multiple integrations (including webhook) can be attached to each agent.
- Integrations can be enabled or disabled without removing them.
