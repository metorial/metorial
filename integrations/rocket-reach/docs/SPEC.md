# Slates Specification for RocketReach

## Overview

RocketReach is a contact data and business intelligence platform that provides access to verified email addresses, phone numbers, and social media links for over 700 million professionals and 60 million companies. It offers search and lookup APIs for people and company data enrichment, primarily used for lead generation, prospecting, and CRM enrichment.

## Authentication

Every request to the RocketReach API requires an API Key for authentication. All API calls require the API Key to be included in the request header.

**Method:** API Key (passed as a custom header)

- **Header name:** `Api-Key`
- **Header value:** Your generated API key
- To create a RocketReach API key, go to Account Settings and click "Generate New API Key."

**Example:**

```
Api-Key: YOUR_API_KEY
```

**Base URL:** `https://api.rocketreach.co/api/v2/`

If the API Key is missing or invalid, you will receive a 401 Unauthorized error.

No OAuth or other authentication methods are supported. The API key is the sole authentication mechanism.

## Features

### People Search

You can search for people by name, job title, company, LinkedIn URL, and location. You can refine searches using exact matches, exclusions, and ordering filters. Search results do not include contact details — you must use the Lookup API to retrieve emails or phone numbers. API searches do not deduct lookup or export credits — only contact retrieval does.

### People Lookup (Contact Enrichment)

The API allows you to retrieve contact details, including email addresses, phone numbers, and social media links, for professionals based on their name, company, LinkedIn URL, or other identifiers.

- Lookups can be performed using name + employer, LinkedIn URL, or a RocketReach profile ID.
- Lookup credits are deducted only when contact information is successfully retrieved.
- Lookups may take time to process, so you may need to check the status before retrieving results.
- You can set an email preference (personal vs. professional) in Account Settings. Only that type will be shown, and credits are only charged if it's found.

### Bulk People Lookup

Bulk lookups allow you to retrieve contact information for multiple people in a single API request.

- Bulk lookups require at least 10 profiles per request. Up to 100 profiles can be retrieved in a single request. You must set up a webhook to receive bulk lookup results.

### Company Search

Find and filter millions of business records. Supports queries by name, domain, industry, and location.

- Company lookups require a separate purchase of Company Exports.

### Company Lookup (Firmographic Enrichment)

You can search for companies using domain, name, or LinkedIn URL. Company lookups return metadata such as industry, size, revenue, and social links.

- Additional data includes technographics, funding history, and key team members.
- Company lookups do not return direct contact information for employees. To find contacts at a company, use the People Search API after retrieving company metadata.

### Combined People and Company Lookup

A single endpoint that retrieves both a person's contact details and their current company's metadata in one request.

### Suppression Lists

You can suppress (hide) certain profiles from search by uploading a Suppression List (via LinkedIn URL or Name & Company) in Account Settings.

### Account Management

You can use the /v2/account endpoint to view current usage. This includes tracking credits consumed and remaining.

## Events

Webhooks automate API workflows by sending results to your server once a lookup is complete. You must configure a callback URL in your API settings to receive webhook notifications.

### Lookup Completion

When performing a person lookup or bulk lookup, include your webhook ID in the API request. Once the lookup completes, RocketReach will send the results to your webhook URL automatically.

- Webhooks are configured in the RocketReach API Usage & Settings page, where you specify a callback URL and select which endpoints to enable.
- If no webhook ID is provided in the request, the value will default to your top-most enabled webhook.
- Webhook responses can be verified using an HMAC-SHA256 signature with a generated secret, delivered via the `X-RocketReach-Signature` header.
- RocketReach retries failed webhooks multiple times.
