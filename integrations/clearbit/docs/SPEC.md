# Slates Specification for Clearbit

## Overview

Clearbit is a B2B data intelligence platform (now a subsidiary of HubSpot, acquired in December 2023) that provides APIs for enriching contact and company data, identifying anonymous website visitors, and prospecting for leads. Clearbit helps businesses enrich customer records with over 100+ firmographic, demographic, and technographic data points from public and private data sources including social profiles, company websites, crowdsourcing, and more.

## Authentication

Authentication is done via an API key, which can be found in your account settings. Requests are authenticated using HTTP Basic Auth — provide your API key as the basic auth username with no password. Alternatively, you can pass your API key as a Bearer token in an `Authorization` header.

Clearbit provides two keys: a secret API key and a publishable API key. Use the secret API key (prefixed with `sk_`) for server-side API calls. The publishable key is intended for client-side use (e.g., the Reveal JavaScript tag).

**Basic Auth example:**

```
curl 'https://person.clearbit.com/v1/people/email/user@example.com' \
  -u sk_your_api_key:
```

**Bearer Token example:**

```
curl 'https://person.clearbit.com/v1/people/email/user@example.com' \
  -H 'Authorization: Bearer sk_your_api_key'
```

You can view and roll your account's API keys in the dashboard.

## Features

### Person Enrichment

Look up detailed information about a person using their email address. Use a person's email address — and, optionally, more detailed information — to enrich their contact information. Clearbit will return a variety of data including names, locations, social media info, and phone numbers. Lookups can be performed synchronously (streaming/blocking mode) or asynchronously (with webhook delivery for results).

### Company Enrichment

Look up detailed information about a company using its domain name. Returns firmographic data such as company name, industry, employee count, location, funding, technologies used, and more. A combined enrichment endpoint allows looking up both person and company data simultaneously from an email address.

### Reveal (IP Intelligence)

The Reveal API takes an IP address and returns the company associated with that IP. By de-anonymizing traffic on your website, you can report analytics and customize landing pages for specific company verticals. Clearbit Reveal does not identify the specific person visiting your site — only the company.

### Prospector

The Prospector API lets you programmatically find contacts with just a domain name. You can search by role, seniority, or exact title. Supports filtering by location (city, state, country). Useful for building targeted outreach lists for specific accounts.

### Discovery

The Discovery API helps you find companies that meet your unique criteria. You might want to search for every established business using some new technology, or that has similar existing customers as yours. Allows searching by attributes like company size, location, industry, and technology usage.

### Name to Domain

Convert a company name to its website domain. Provide Clearbit with a partial company name to retrieve more complete company information. This can return the company's full name, domain, and logo.

### Logo

Find a company's logo via the company's domain. Clearbit will return a logo by searching through various sources, including social media accounts.

### Risk Scoring

Get a risk score for a new signup by checking their email and IP address against a number of factors, including if their name matches their email, if the email address is disposable, and if the IP or email address is blacklisted. Useful for fraud prevention and compliance checks.

### Autocomplete

Provides company name autocomplete suggestions as users type, useful for building forms and search interfaces.

## Events

Clearbit supports webhooks in two primary ways:

### Enrichment Webhooks

When performing asynchronous (non-streaming) enrichment lookups, you can use the webhook API. Without the stream option, the operation is non-blocking, and Clearbit will immediately return either the enriched data or a pending status. Once the lookup completes, Clearbit delivers the enrichment result to a configured webhook URL. The webhook URL is configured in the Clearbit API dashboard settings. Webhook payloads are signed for verification using the secret API key.

### Audience Webhook Destinations

The Webhook Destination allows you to send segment/audience matches anywhere you need to. When enabled, Clearbit will post a JSON payload to the URL you specify. The payload includes data about the company/person that matched as well as metadata about the destination and segment.

Configurable trigger types:

- Triggers only when a company/person enters the audience.
- Triggers only when a company/person exits the audience.
- Triggers every time a company/person views a page on your site.

Additional options include:

- Delivery suppression: when enabled, people/companies that you've been alerted to within a configured time period will be excluded.
- Customizable payload — allows you to specify exactly which attributes you want to send via webhook.
