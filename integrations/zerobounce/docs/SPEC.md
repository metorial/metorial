Now let me check the Activity Data API, Domain Search API, and List Evaluator API pages for more details:Now let me check the List Evaluator API and the WHOIS checker:I now have enough information to write the specification.

# Slates Specification for Zerobounce

## Overview

ZeroBounce is an email validation and deliverability platform. It provides APIs for verifying email addresses, scoring email quality using AI, finding business email addresses, searching domains for email formats, and checking email activity data. The platform offers both real-time and bulk file-based processing.

## Authentication

ZeroBounce uses API key authentication. All API requests require an `api_key` parameter.

- From the dashboard, navigate to the API section to grab your API key. You can generate up to 5 API keys.
- The API key is passed as a query parameter (`api_key`) for GET requests or in the request body for POST requests.
- Example: `https://api.zerobounce.net/v2/validate?api_key=YOUR_API_KEY&email=example@example.com`
- There are three regional API base URLs available: a default URL (`api.zerobounce.net`), a U.S.A.-specific URL (`api-us.zerobounce.net`), and an EU URL (`api-eu.zerobounce.net`).
- Bulk file operations use a separate base URL: `bulkapi.zerobounce.net`.
- No OAuth or token refresh mechanisms are involved; the API key is static and managed from the account dashboard.

## Features

### Email Validation (Single and Batch)

Validates email addresses in real time to determine their deliverability status. The API can identify email addresses with more than 30 status and sub-status descriptions, including valid, invalid, catch-all, spam trap, abuse, disposable, and do-not-mail. Returns enrichment data such as the associated first name, last name, gender, location, domain age, MX records, and SMTP provider. Optionally, Activity Data information can be appended to the validation result. A "Verify+" mode is also available for enhanced validation.

- **Single validation**: Validate one email at a time in real time.
- **Batch validation**: The batch endpoint allows you to validate up to 200 emails simultaneously.
- Configurable timeout parameter to control how long to wait before returning an unknown/greylisted result.

### Bulk File Validation

Allows uploading CSV, XLS, XLSX, or TXT files containing email lists for asynchronous bulk validation. For files with more than 200 emails, the bulk file management endpoints should be used, which also include anti-greylisting. After submission, you can check file processing status, download results, and delete files.

### A.I. Email Scoring

The A.I. Scoring API combines data with statistical analysis to rate the quality level of an email address. It returns a score indicating how active a subscriber is, ranging from 0 to 10, with 10 being ideal. This is useful for evaluating catch-all emails and segmenting lists by engagement likelihood. Available for both single emails and bulk file processing.

### Email Finder

The Email Finder API searches for business email addresses using a person's first and last name and a domain or company name, testing patterns and combinations in real time until it identifies a valid business email.

- Requires either a domain or company name; first, middle, and last name are optional refinement parameters.
- A successful search consumes one subscription query or 20 credits. No credits are deducted for undetermined results.

### Domain Search

Searches a domain to discover the email format patterns used by that organization. Also available as a bulk domain search for processing multiple domains at once.

### Activity Data

The Activity Data API identifies which contacts have opened, clicked, forwarded, or unsubscribed from emails in the last 30–180 days. This helps determine whether an email inbox is currently active, which is useful for filtering out stale contacts before campaigns.

### List Evaluator

Provides a free preliminary assessment of an email list's health before committing validation credits. Upload a file of at least 100 emails, and the API returns estimated percentages of risky addresses and bounce rates. If the list evaluator suspects a high bounce rate, you can configure the API to send the list for validation automatically.

### Website Availability and WHOIS Checker

Checks website availability and retrieves WHOIS information for a given domain.

### Allowlist and Blocklist Management

Allows configuring custom filter rules to automatically allow or block specific email addresses or domains during validation.

### Account Management

Retrieve your current credit balance and API usage statistics (number of validations performed within a date range, broken down by status).

## Events

The provider does not support events. ZeroBounce's API is request-response based and does not offer webhooks or event subscription mechanisms.
