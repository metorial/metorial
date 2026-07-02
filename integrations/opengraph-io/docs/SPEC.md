# Slates Specification for OpenGraph.io

## Overview

OpenGraph.io is a web data extraction service that provides APIs for retrieving Open Graph metadata from URLs, scraping raw HTML from websites, capturing webpage screenshots, and extracting structured content. It offers link previews, screenshots, web scraping, and MCP integration for AI assistants.

## Authentication

OpenGraph.io uses API keys for authentication. The API key is referred to as an "App ID."

- **Obtaining an API key**: Log in to your OpenGraph.io account. In the API keys section, click "Create API Key" and copy the API key value shown.
- **Using the key**: Include the `app_id` parameter as a query parameter with each API request. For example:
  ```
  https://opengraph.io/api/1.1/site/https://example.com?app_id=YOUR_APP_ID
  ```
- Create an account (no credit card ever required) to receive your app_id.

There is no OAuth flow or other authentication method. All requests are authenticated solely via the `app_id` query parameter.

## Features

### Site Unfurling (Link Previews)

Extract OpenGraph metadata, Twitter Cards, and HTML meta tags from any URL. Given a URL, the API scrapes the page and returns structured metadata including title, description, image, type, and URL.

- If some tags are missing, the service will attempt to infer them from the content on the page, and these inferred tags will be returned as part of the "hybridGraph." The hybridGraph results always default to any OpenGraph tags found on the page. If only some tags were found, or none were, the missing tags will be inferred from the content.
- **Key options**:
  - `cache_ok`: Use cached results for faster responses, or force fresh data retrieval.
  - `full_render`: Fully render the site using a Chrome browser before parsing its contents. This is especially helpful for single page applications and JS redirects.
  - `use_proxy`: Route requests through proxies to bypass bot detection on restrictive sites.
  - `accept_lang`: Specify the language to present to the target site.

### HTML Scraping

The Web Scraper API lets you programmatically fetch and extract the raw HTML from any public website. It handles anti-bot protections, JavaScript rendering, and complex site structures.

- Returns the raw HTML content of the requested page.
- **Key options**:
  - `cache_ok`: Control whether to use cached results or fetch fresh data.
  - `full_render`: Enable full_render to capture content from JavaScript-heavy sites and single-page applications.
  - Proxy options: `use_proxy`, `use_premium`, and `use_superior` for different levels of scraping capabilities.

### Screenshot Capture

The screenshot API endpoint allows you to capture screenshots of web pages. By providing a URL, the API returns an image capture of the specified site.

- **Key options**:
  - `dimensions`: The API accepts four different viewport sizes.
  - `full_page`: Capture the entire page rather than just the viewport.
  - `quality`: Scale image quality up or down.
- Screenshot images are available for download for 24 hours after they are generated. After this time period, the images are automatically removed.

### Content Extraction

Extract specific HTML elements in a structured format for AI/LLM pipelines. This service parses web pages and returns structured content rather than raw HTML, making it suitable for feeding into data processing or AI workflows.

### AI-Powered Page Querying

Ask questions about any webpage and get structured answers powered by AI. This allows you to submit a URL along with a question and receive an AI-generated answer based on the page's content.

## Events

The provider does not support events. OpenGraph.io is a stateless, request-response API with no webhook or event subscription capabilities.
