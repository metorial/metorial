I see there are multiple products called "Abstract." Let me clarify which one - the most likely candidate for an integration platform is either Abstract (goabstract.com - design version control) or Abstract API (abstractapi.com - suite of utility APIs). Let me research the Abstract API platform more specifically.Now let me look at the specific API documentation for authentication details and individual API features.Now I have enough information to write the specification. Let me compile it based on my research.

# Slates Specification for Abstract

## Overview

Abstract API (abstractapi.com) is a suite of RESTful utility APIs providing data enrichment, validation, and lookup services. It helps automate routine developer work through a suite of 12+ utility APIs including IP Geolocation, Email Validation, Phone Validation, Company Enrichment, and more. The platform is built for global coverage and enterprise-level reliability, with compliance to SOC 2 and GDPR standards.

## Authentication

Abstract API uses API Key authentication. To authenticate requests, you append your API key to the base URL as a query parameter named `api_key`.

Each API service within Abstract has its own separate API key. When you sign up and navigate to a specific API (e.g., Email Validation), you navigate to the API's page which displays your unique API key for that API.

The API key is passed as a query parameter in GET requests. For example:

```
https://emailvalidation.abstractapi.com/v1/?api_key=YOUR_UNIQUE_API_KEY&email=test@example.com
```

Each API has its own base URL following the pattern `https://{service}.abstractapi.com/v1/`. You can also export API keys as environment variables following the scheme `ABSTRACTAPI_{SERVICE_NAME}_API_KEY`, where SERVICE_NAME is all uppercase and underscore separated.

No OAuth or other authentication methods are supported — only API key authentication.

## Features

### Email Validation & Reputation

Takes an email address and identifies whether it is valid or not, and how risky it is. Helps detect and suppress invalid or disposable email addresses to reduce bounce rates and improve deliverability. Checks include format validation, SMTP verification, MX record checks, disposable email detection, catch-all detection, role email detection, spam trap detection, and typo autocorrection. The Email Reputation API extends this with sender enrichment (name, organization) and domain intelligence (age, registrar, risk).

### Phone Validation & Intelligence

Validates phone numbers and provides details including carrier, line type, validity, and location. The Phone Intelligence API adds deeper insights such as line status, VoIP detection, risk scoring, and SMS domain information.

### IP Geolocation & Intelligence

Provides advanced security and geographical insights about IP addresses worldwide. It identifies VPNs, proxies, TOR usage, abuse potential, hosting services, relays, and mobile IPs. Returns location data (city, region, country, coordinates), timezone, ASN information, company data, and country flag/currency. You can filter response fields by including a `fields` parameter with a comma-separated list of top-level keys.

### Company Enrichment

Enriches any domain or email with accurate company data, including headcount, location, and industry.

### Exchange Rates & Currencies

Provides live and historical exchange rate data, and supports currency conversion between global currencies.

### Public Holidays

Returns public holidays for any country at any time. Supports filtering by country, year, month, and day.

### Time, Date & Timezone

Retrieves current time and date for any timezone, and supports timezone conversion between locations.

### Web Scraping

Extracts data from any website by providing a URL. Returns the page's rendered content.

### Website Screenshot

Captures screenshots of any URL or HTML content. Useful for generating visual previews of web pages.

### Image Processing

Compresses and optimizes images. Accepts images via URL and applies transformations such as quality adjustments.

### User Avatars

Generates flexible user avatars based on input parameters, useful for creating default profile images.

### VAT Validation & Rates

Validates VAT numbers and retrieves current VAT rates by country, supporting EU VAT compliance.

### IBAN Validation

Validates International Bank Account Numbers (IBAN) for correctness and format compliance.

## Events

The provider does not support events. While webhook support is listed on some tracker sites, Abstract API's core services are stateless lookup/validation APIs that do not produce asynchronous events, webhooks, or subscription-based notifications. All interactions are synchronous request-response calls.
