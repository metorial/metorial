# Slates Specification for Agentql

## Overview

AgentQL is an AI-powered web data extraction and automation platform. Its REST API allows you to query web pages and documents like PDFs and image files to retrieve structured results through HTTP requests. It uses natural language queries to pinpoint data and elements on any web page, including authenticated and dynamically generated content.

## Authentication

AgentQL uses API key authentication. All requests to the AgentQL API must include an `X-API-Key` header with your API key. You can generate an API key through the [Dev Portal](https://dev.agentql.com).

The API key is passed as a request header:

```
X-API-Key: YOUR_AGENTQL_API_KEY
```

No OAuth or other authentication methods are supported. There are no scopes or additional credentials required beyond the API key.

## Features

### Structured Data Extraction from Web Pages

Queries structured data as JSON from a web page given a URL using an AgentQL query. You can provide either a URL to a public web page or raw HTML content. You must define either an AgentQL query (a structured query language) or a natural language prompt to describe the data you want. AgentQL infers the data structure from your prompt.

- **Query vs Prompt**: Use a structured AgentQL query to define exact output shape, or a natural language prompt for AgentQL to infer the structure automatically.
- **Parameters**: Optional settings include wait time for page load, scrolling to bottom of page before querying, mode selection (`fast` for speed or `standard` for deeper analysis), and screenshot capture for debugging.
- AgentQL's natural language selectors find elements intuitively based on the content of the web page and work across similar web sites, self-healing as UI changes over time.

### Document Data Extraction

Extract data from a document by sending a PDF or image (JPEG, JPG, PNG) file and an AgentQL query. The query_document function consumes 1 API call per image, and 1 API call for each page within a PDF.

- Supports PDF files and common image formats.
- Uses multipart/form-data for file upload along with a query in the request body.

### Remote Browser Sessions

Create a remote browser session that provides a Chrome DevTools Protocol (CDP) URL for connecting to a remote browser instance. This allows you to run browser automation on remote infrastructure.

- Optional user agent preset to simulate different operating systems (windows, macos, linux).
- Proxy configuration for the browser session, supporting both AgentQL's managed (Tetra) proxy infrastructure with optional country selection and custom proxy servers.
- Remote browser sessions provide CDP access for full browser control.
- Browser profiles include LIGHT (default) and STEALTH modes for enhanced bot detection avoidance.
- A shutdown_mode parameter controls session teardown behavior: `on_disconnect` (default) terminates the session when the last client disconnects, while `on_inactivity_timeout` keeps the session alive for reuse within a configurable timeout window.

### Cross-Site Query Compatibility

Cross-site compatibility lets you use the same query across different sites with similar content. Queries deliver consistent results despite dynamic content and page changes.

## Events

The provider does not support events. AgentQL is a request-response API for data extraction and browser automation, and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
