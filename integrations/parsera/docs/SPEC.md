Now let me check the output types and scrapers docs for completeness:Now let me check the Code Mode page:I now have enough information to write the specification.

# Slates Specification for Parsera

## Overview

Parsera is an AI-powered web scraping service that extracts structured data from web pages using natural-language descriptions of the desired data fields. It offers both LLM-based one-time extraction and reusable code-generated scrapers that can be run across multiple URLs.

## Authentication

Parsera uses API key authentication. The API key can be found on the API tab of the Parsera web page and is passed as the value of the `X-API-KEY` header in all requests.

- **Header:** `X-API-KEY: <YOUR_API_KEY>`
- **Base URL:** `https://api.parsera.org/v1/`

No OAuth or additional authentication mechanisms are supported. A Parsera account is required to obtain an API key.

## Features

### LLM-Powered Data Extraction

Extract structured data from any web page by providing a URL and either a natural-language prompt or a list of named attributes describing the data to extract. Each attribute has a `name` and `description`, and optionally a `type` (string, integer, number, bool, list).

- **Proxy support:** A `proxy_country` parameter can be set to access pages from specific geographic locations, since a page could be unavailable from some locations.
- **Precision mode:** If some data is missing, a `precision` mode can be used, which looks into data hidden in HTML tags.
- **Cookies:** Custom cookies can be passed to handle authenticated or session-based pages.

### Content Parsing

A parse capability allows extracting data from raw HTML or text content provided directly, rather than fetching from a URL. Supports the same attribute definitions and extraction modes as URL-based extraction.

### Markdown Extraction

Convert any web page into markdown format by providing a URL. Supports proxy and cookie configuration.

### Reusable Scrapers

Scrapers are reusable custom extractors that can be generated once and run on multiple URLs. This is ideal for scenarios where the same type of data needs to be extracted from multiple pages or websites.

- **Create** a scraper, **generate** extraction code by providing a sample URL and desired attributes, then **run** the scraper on any number of URLs.
- Scrapers can be run on up to 100 URLs at once.
- Scrapers can be listed and deleted via the API.

### Code Mode

Generate custom Python scraping code for a scraper instead of relying on LLM-based extraction at runtime. Code mode provides faster, more deterministic, and more cost-effective extraction. The scraper must be switched to code mode in the Parsera UI after code generation.

## Events

The provider does not support events.
