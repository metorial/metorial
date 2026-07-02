Now let me look at the full API reference to understand all features:Now I have enough information to write the specification.

# Slates Specification for Piloterr

## Overview

Piloterr is a web scraping API platform that provides 50+ pre-built endpoints for extracting structured data from websites. It manages proxy rotation, browsers, anti-bots, and captchas, allowing developers to scrape any webpage with a single API request. It specializes in web scraping API with custom endpoints and rotating proxies, helping businesses extract unstructured data and automate workflows.

## Authentication

Piloterr uses API key authentication. Piloterr uses API keys for authentication.

To obtain an API key:

1. Navigate to the [Piloterr Dashboard](https://piloterr.com/login) and create an account or log in.
2. Click **API Keys**, then select **New**.
3. Assign a name for the token, optionally add notes, and select **Save**.

The API key must be included in every request as a custom header:

```
x-api-key: <YOUR_API_KEY>
```

Example request:

```
curl -H "x-api-key: YOUR_API_KEY" https://piloterr.com/api/v2/company?query=gucci.com
```

The API key is generated from the Piloterr Dashboard under the "API" tab and grants full access to all capabilities of the platform. There are no OAuth flows, scopes, or additional credentials required. Some endpoints are classified as "private" and require requesting access through a form on the Piloterr website before they can be used with your API key.

## Features

### Web Scraping / Website Crawling

A high-performance scraping API designed to navigate and extract HTML from any site. Includes advanced parsing, TLS fingerprinting, rotating proxies, smart retries, and the ability to bypass anti-bot protections like Cloudflare, Akamai, PerimeterX, and DataDome.

- Provide a URL and receive the rendered HTML content.
- Web Unlocker is an advanced scraping mode that bypasses sophisticated anti-bot protections.

### Website Technology Detection

Retrieve website technology information including CMS, framework, analytics, CDN, hosting, and more.

- Input a domain and receive a breakdown of the technology stack used by that website.

### Company Data Enrichment

Search among a database of 60 million companies and enrich data with daily-updated insights about businesses and their workforce.

- Query by domain name to retrieve company information such as description, employee count, industry, and more.

### LinkedIn Data Extraction

Extract structured public data from LinkedIn, including:

- Profile information from LinkedIn profiles for networking or research purposes.
- Company information from LinkedIn company pages.
- Job listing details including title, employment type, industry, seniority level, total applicants, company details, location, and job description.
- LinkedIn post retrieval for content analysis.
- Product information for LinkedIn-listed products and services.
- Real-time job counts by industry, region, and role.
- Job search based on keywords and location.
- Some LinkedIn endpoints require requesting private access before use.

### Search Engine Scraping

Extract search results from multiple search engines:

- Google Search and Google Search Autocomplete
- Google Images
- Bing Search
- Brave search engine results.

### E-Commerce Product Data

Extract product and search data from various e-commerce platforms including Amazon, Best Buy, Walmart, Allegro, Auchan, Carrefour, Cdiscount, Chewy, Autodoc, ManoMano, and Shopify.

- Retrieve product details, pricing, and search results from supported retailers.

### Business Intelligence (Crunchbase)

- Monitor funding history and financial milestones of companies with Crunchbase data.
- Retrieve company information, people profiles, search results, and event data from Crunchbase.

### Domain & Email Tools

- Domain Whois API for extracting domain registration information.
- Domain reputation and DNSBL checking.
- Email validation and verification via SMTP verification.
- Email finder for locating email addresses.

### Real Estate Data

- Extract data from SeLoger real estate ads.
- Extract property data from Homestra.

### Automotive Data

- Access vehicle data from AutoScout24 for automotive insights.

### Prediction Markets

- Collect and structure public data from Polymarket, including markets, probabilities, trading volumes, liquidity, results, and historical data.

### GitHub Data

- Retrieve public user information from GitHub profiles.

### Screenshot API

- Capture high-quality images of any webpage with a simple API request.

### Usage Monitoring

- Check your current plan and remaining API credits via the usage endpoint.

## Events

The provider does not support webhooks. Piloterr is a request-response API platform focused on on-demand data extraction and does not offer any webhook, event subscription, or built-in polling mechanism.
