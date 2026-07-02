# Slates Specification for Fullenrich

## Overview

FullEnrich is a B2B contact data enrichment platform that aggregates data from 20+ premium vendors using a waterfall approach to find work emails, personal emails, and mobile phone numbers for business contacts. It also offers reverse email lookup and people/company search capabilities.

## Authentication

FullEnrich uses **Bearer Token (API Key)** authentication. Every API request must include an `Authorization` header with a valid API key:

```
Authorization: Bearer YOUR_API_KEY
```

The API key can be obtained from the FullEnrich dashboard at `https://app.fullenrich.com/app/api`. There are no OAuth flows, scopes, or additional credentials required. If a key is compromised, it can be regenerated from the dashboard.

## Features

### Contact Enrichment

Find verified contact information (work email, personal email, mobile phone number) and professional profile details for people you want to reach. Requires at minimum the contact's first name, last name, and either a company domain or company name. Optionally, providing a LinkedIn URL increases the probability of finding results. Supports bulk enrichment of up to 100 contacts per request. The enrichment process is **asynchronous** — you submit a request and receive results via webhook or by polling a GET endpoint. Credits are only consumed when a phone number or email is found.

### Reverse Email Lookup

Identify the person and company behind an email address (personal or professional). Returns a full person profile (name, job title, location, work history) and company details (name, industry, headcount). This feature is API-only and not available through CSV upload or manual entry. The process is asynchronous, like standard enrichment.

### People Search

Search for contacts using filters such as job title, location, industry, company, education, and more. This is a **synchronous** API — results are returned immediately. Returns professional details including work history, location, education, and company information. Useful for prospecting and building targeted contact lists. Does not return emails or phone numbers directly; use the Enrich API to obtain contact details for found people.

### Company Search

Search for companies using various filters. Returns company details such as name, industry, headcount, and location. Like People Search, this is synchronous and returns results immediately.

### Credit Balance

Check remaining credits available in your workspace. Useful for monitoring usage before initiating enrichment requests.

### API Key Verification

Verify whether your API key is valid and active.

## Events

FullEnrich supports webhooks for receiving enrichment and reverse email lookup results.

### Enrichment Batch Completion

When an enrichment or reverse email lookup batch is complete (finished, out of credits, or canceled), FullEnrich sends a POST request to your specified `webhook_url` with the full results. You provide the `webhook_url` when starting an enrichment request. If delivery fails (non-2xx response), FullEnrich retries every minute up to 5 times. You can include a `custom` object with arbitrary string identifiers (e.g., CRM contact IDs) in each contact — these are returned in the webhook payload for tracking purposes. Webhook authenticity can be verified using a SHA1-signed header against your API key.

### Individual Contact Completion (Real-Time)

For real-time use cases, you can specify a `webhook_events.contact_finished` URL. This fires a webhook immediately after each individual contact is enriched, without waiting for the full batch to complete. This can be used alongside the batch completion webhook, so you receive both per-contact and batch-level notifications.
