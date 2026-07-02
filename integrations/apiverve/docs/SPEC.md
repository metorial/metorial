# Slates Specification for Apiverve

## Overview

APIVerve is a comprehensive API platform that provides developers with access to over 200+ utility, data, and AI-powered APIs through a single, unified interface. It simplifies API integration with consistent authentication, standardized response formats, and reliable infrastructure. Categories span AI/Computer Vision, Astrology, Calendar, Data Conversion, Data Generation, Data Lookup, Data Processing, Data Scraping, Data Validation, Documents, Domain Data, Entertainment, Finance, Food, Geography, Health/Wellness, News, Parsers, Science, Text Analysis, Transportation, and Weather.

## Authentication

APIVerve uses a single authentication method: **API Key via request header**.

APIVerve uses a single API key per account for authentication. This key must be included in the `X-API-Key` header for all API requests.

Your API key is a unique identifier that authenticates your account with APIVerve services. Each account has one API key that can be rotated as needed for security purposes.

**How to obtain an API key:**

After signing up and verifying your email, log into your APIVerve dashboard to access your unique API key. This key serves as your authentication token for all API requests and is generated automatically when your account is created.

**Usage example:**

```
GET /v1/{endpoint} HTTP/1.1
Host: api.apiverve.com
X-API-Key: your_api_key_here
Content-Type: application/json
```

All API calls are required to be made over HTTPS. Calls made over HTTP will fail.

You can copy your current key or rotate it to generate a new one. Rotating your key immediately invalidates the old key.

**Base URL:** `https://api.apiverve.com/v1/`

APIVerve also supports a GraphQL interface where authentication is handled via the `x-api-key` header in your GraphQL request, not as a query parameter.

## Features

### Data Validation & Verification

Validate and verify various types of data including email addresses, phone numbers, BIN numbers, SSL certificates, and domain WHOIS information. Useful for form validation, fraud prevention, and data quality assurance.

### Text Analysis & Processing

Services range from simple utility functions like QR code generation and URL shortening to complex AI-powered services like sentiment analysis and image processing. Includes grammar checking, hashtag generation, and other text processing capabilities.

### Data Generation

Generate test data, barcodes, QR codes, captchas, TOTP codes, baby names, and other synthetic data. Useful for testing, prototyping, and application features that require on-the-fly content creation.

### Finance & Currency

Access financial data including currency exchange rates, currency symbols, gold prices, stock data, CPI inflation data, and BIN lookups. Supports various currencies and financial instruments.

### Weather & Geography

Retrieve current weather conditions, air quality data, earthquake information, and geographic data for locations worldwide. Includes IP geolocation services.

### AI & Computer Vision

AI-powered APIs for tasks such as gender detection from names, sentiment analysis, and image processing.

### Domain & Web Data

Look up domain registration (WHOIS), SSL certificate details, fully qualified domain names, Gravatar profiles, and perform web scraping operations.

### Data Conversion & Lookup

Convert between data formats and look up reference data such as US car models, historical events, and Bible verses.

### Multiple Response Formats

APIs support multiple query options and return responses in JSON, XML, YAML, and CSV formats.

### GraphQL Access

Access APIs through GraphQL to combine multiple API calls in a single request. Query only the data you need with precise field selection, and orchestrate complex data fetching workflows.

- Each API called in your GraphQL query consumes its standard credit cost.

### Credit-Based Usage

APIVerve gives access to 300+ production-ready APIs with a single API key. All APIs are accessible under a unified credit-based billing model. The free trial includes 100 API credits per month and a rate limit of 5 requests per minute. Some parameters are restricted to paid plans only.

## Events

The provider does not support events. APIVerve is a request-response API platform without webhooks, event subscriptions, or purpose-built polling mechanisms.
