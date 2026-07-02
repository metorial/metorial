Now I have enough information to write the specification.

# Slates Specification for Icypeas

## Overview

Icypeas is a B2B data enrichment platform that provides professional email discovery, email verification, domain scanning, LinkedIn profile/company scraping, lead database search, and reverse email lookup. It operates on a credit-based system and exposes all features via a REST API.

## Authentication

Icypeas' API works using a key that identifies the API user. To access your API key, you first need to create an account on the platform.

The API key is obtained from the API section in the Icypeas app dashboard. Once you have your key, include it in every request via two required headers:

1. `Authorization` — set to your API key directly (no prefix like "Bearer")
2. `Content-Type` — set to `application/json`

All API requests are made to `https://app.icypeas.com/api/`.

For webhook signature verification, Icypeas also provides an API secret. All webhook routes are called using a POST request and include an HMAC-SHA1 signature computed using the API secret, which you can use to verify the authenticity of incoming notifications.

## Features

### Email Discovery

Find professional email addresses for individuals by providing their first name, last name, and company domain or name. The API allows you to make single and bulk searches. Results include email addresses with confidence levels (e.g., "ultra_sure"), MX provider information, and gender inference. Bulk search supports task types: `domain-search`, `email-search`, or `email-verification`.

- Requires at least a first name or last name, plus a domain or company name.
- Searches are asynchronous — you submit a request, receive an ID, and poll or use webhooks to get results.
- Each bulk search launched from the API cannot contain more than 5,000 items.

### Email Verification

Verify whether an email address is valid and deliverable. Icypeas can verify Google and Microsoft catch-all domains. Available as both single and bulk operations.

- Input: an email address.
- Returns verification status indicating whether the email is valid, invalid, or risky.

### Domain Scanning

Scan a domain or company name to find role-based emails like support@, info@, or contact@ addresses. Available as single and bulk operations.

- Input: a domain name or company name.
- Identifies generic addresses like info@ or contact@ at any company.

### Profile Scraping

Scrape professional profile data from LinkedIn-style profile URLs. Returns detailed information about individuals including job titles, company, and profile summaries. A separate endpoint also supports company profile scraping.

- Input: a profile URL (for person or company).
- Transforms email addresses into complete professional profiles — names, job titles, companies, and LinkedIn data.

### Profile URL Finder

Find LinkedIn profile URLs for people or companies. For people, you can search by first name, last name, company name/domain, and job title. For companies, you can search by company name or domain.

### Lead Database Search

Search for people in the lead database using filters. A separate endpoint allows searching for companies. Both support count queries to preview result volumes before retrieving data.

- Supports filtering by various professional and firmographic criteria.
- Results are paginated.

### Reverse Email Lookup

Icypeas' reverse email lookup API automatically identifies profiles from email addresses, revealing company details, seniority levels, and social profiles.

- Input: an email address.
- Returns enriched profile data associated with the email.

### Subscription Management

You can retrieve your remaining credits and your current subscription via the API.

## Events

Icypeas supports webhooks (called "push notifications") for bulk search operations. The different kinds of notifications you can get are: a summary about your results at the end of a bulk search; updates for each single search or each item in your bulk search. This is the preferred way to check progress in the API.

Webhook URLs can be configured in two ways: globally via account settings in the Icypeas dashboard, or per bulk search by passing custom webhook URLs when creating a bulk search.

### Item Processed

A custom webhook is called each time a row is processed, giving you the result for that row. This applies to each individual item within a bulk search (email search, verification, or domain scan).

- Can be configured globally or per-bulk-search via the `webhookUrl` parameter.

### Bulk Search Completed

A custom webhook is called when the whole bulk search is processed, providing statistics about the bulk search (not the individual results).

- Can be configured globally or per-bulk-search via a dedicated parameter.

All webhook payloads include an HMAC-SHA1 signature and timestamp for verification.
