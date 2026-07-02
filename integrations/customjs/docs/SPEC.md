Now let me get more details on the Make.com modules to understand the full feature set:Now I have enough information to write the specification.

# Slates Specification for Customjs

## Overview

CustomJS is an automation platform by TechnologyCircle GmbH that allows users to execute custom JavaScript and Python code via API, generate PDFs and images from HTML, capture website screenshots, scrape web content, and host static HTML pages. It integrates with automation platforms like Make.com, n8n, Zapier, and Power Automate, and also offers a standalone HTTP API.

## Authentication

CustomJS uses **API key** authentication.

1. Sign up at [https://app.customjs.io](https://app.customjs.io).
2. After logging in, your API key is displayed on the right-hand side of the dashboard.
3. The API key is used to authenticate requests by verifying the provided key and gaining access to workspace-level details.

For API requests, the key is used in two ways depending on the endpoint:

- **Execution endpoint:** The API key is embedded in the URL path: `POST https://e.customjs.io/__js1-{api_key}`. A `customjs-origin` header should also be included to identify the calling platform.
- **Management/auth endpoint:** Pass the API key both in the URL and as a header: `GET https://api.app.customjs.io/core/api-key/{api_key}` with header `x-api-key: {api_key}`.

The standard CustomJS API key works for all new modules. Only for some older Make.com modules that are still in operation is a RapidAPI key required; this does not apply to n8n or Zapier modules.

## Features

### Custom JavaScript Execution

Allows users to create and integrate custom JavaScript logic as an HTTP API. Supports Node.js with full NPM module support. Code is sent inline in the request body along with an optional `input` parameter for data to process. Useful for data transformations, calculations, API integrations, and custom business logic.

### Custom Python Execution

Runs custom Python code written inline in a module. Available for data analysis, API interactions, or other logic that is better suited to Python.

### PDF Generation and Manipulation

- **HTML to PDF:** Converts HTML into pixel-perfect PDFs via API. Supports styled HTML with CSS for generating invoices, reports, certificates, etc.
- **Merge PDFs:** Combines multiple PDF files (provided as URLs) into a single document.
- **Extract Pages:** Splits a PDF or extracts specific page ranges into a new PDF.
- **Compress PDF:** Reduces the file size of PDFs without losing quality.
- **PDF to Text:** Extracts all text content from a PDF file.
- **PDF to PNG:** Converts PDF documents or specific pages into PNG images.
- **Read PDF Form Fields:** Extracts all form field names and types from a fillable PDF.

### Image Generation

- **HTML to PNG:** Converts HTML content into high-quality PNG images. Useful for generating charts, infographics, and dynamic OG images.
- **Website Screenshots:** Captures high-resolution web views in seconds from any public URL.

### Web Scraping and Browser Automation

- **Scraper:** Crawls websites and extracts data, including handling interactive elements like clicks and typing for dynamic content.
- **Puppeteer:** Provides full headless browser control for advanced web automation tasks.

### HTML Page Hosting

Deploys HTML landing pages with a single API call, with no Git or build steps required. Suited for AI-generated pages, campaigns, and prototypes. Supports custom domains.

### Form Builder

Collects data directly into Make or n8n workflows. Forms can submit data to webhook endpoints. Supports custom domains and integration with automation platforms.

### Mail Hook

Creates custom email addresses that forward incoming emails to webhooks. Connects to Make, n8n, or any webhook endpoint to build email-triggered automations.

- Emails are forwarded to webhooks in real-time with no delays or polling.
- Provides sender, subject, body, HTML content, and metadata in JSON format, and includes attachments with direct download links.
- Emails are stored for 60 days.

### Data Processing Utilities

- Selects, extracts, and flattens specific values from complex, nested JSON structures using JSON Path or simple selectors.
- Performs Regex pattern extraction, search-and-replace, and validation on unstructured text data.
- **SSL Checker:** Monitors SSL certificates and retrieves expiration dates.

### Stored Functions

Runs functions written and stored within the CustomJS platform. Enables centrally managed, reusable code that can be invoked from any integration or API call.

## Events

The provider does not support events. CustomJS is a request-response execution platform and does not offer webhooks or event subscription mechanisms for listening to changes. Note that while CustomJS _sends data to_ external webhooks (e.g., form submissions, Mail Hook forwarding), it does not provide an event system that external consumers can subscribe to for platform-level events.
