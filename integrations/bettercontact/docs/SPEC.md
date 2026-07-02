Now let me check for the credits balance endpoint:Now I have enough information to write the specification.

# Slates Specification for Bettercontact

## Overview

BetterContact is a B2B contact enrichment platform that uses waterfall enrichment across 20+ data sources to find and verify work email addresses and mobile phone numbers. It sequentially queries multiple data providers using an AI-driven algorithm to determine the optimal provider order, and validates results through multiple verification layers.

## Authentication

All API endpoints are authenticated using the `api_key` parameter provided in the request. The API key is passed via the `X-API-Key` HTTP header.

The API key is a unique code that identifies your BetterContact account. It's used when connecting to services like the Google Sheets Add-on, HubSpot, Clay, or other API features.

To obtain your API key:
Go to your BetterContact dashboard. Navigate to the API section. Your API key will be displayed there.

The base URL for API requests is `https://app.bettercontact.rocks/api/v2`.

Example header usage:

```
X-API-Key: your-api-key-here
```

## Features

### Contact Enrichment

Submit one or more contacts for enrichment to find their work email addresses and/or mobile phone numbers. There is an endpoint to submit one lead or a batch of leads to enrich and a second endpoint to fetch the results. Enrichment is asynchronous — you submit contacts and later retrieve results via a request ID.

- **Input parameters**: First name, last name, company name, company domain, and LinkedIn URL. LinkedIn URL is optional but improves accuracy.
- **Enrichment options**: You can choose to enrich email addresses, phone numbers, or both via `enrich_email_address` and `enrich_phone_number` boolean flags.
- **Process flow**: An optional `process_flow` parameter can be provided to control the enrichment process.
- **Custom fields**: You can attach custom fields (e.g., UUID, list name) to contacts for tracking purposes.
- The BetterAI algorithm analyzes your contacts information and builds the optimal sequence on which providers to request first.
- Results include the enriched email/phone, deliverability status, the data provider that found the match, and contact metadata like gender.
- You are not charged for invalid data.

### Retrieve Enrichment Results

Poll for the results of a previously submitted enrichment request using its request ID. The response includes a status indicator (e.g., "terminated" when complete), a summary of results (total, valid, catch-all, undeliverable, not found), and the enriched contact data.

### Credits Balance

Check your account's remaining credit balance and associated email address via a simple authenticated GET request.

## Events

You can set up a webhook URL in the enrichment API call, and the results will be directly pushed to this URL once done.

### Enrichment Completed

When an enrichment request finishes processing, the results are pushed to the webhook URL specified in the original enrichment submission.

- **Configuration**: Provide the `webhook` parameter (a URL) in the enrichment request body.
- The webhook receives the same enrichment result payload that would be returned by the polling endpoint, including enriched contact data, statuses, and credit usage.
- This is a per-request webhook — you specify the URL with each enrichment request rather than configuring a global subscription.
