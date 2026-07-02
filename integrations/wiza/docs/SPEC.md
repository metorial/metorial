# Slates Specification for Wiza

## Overview

Wiza is a B2B contact enrichment and sales intelligence platform that finds verified email addresses, phone numbers, and professional details by leveraging LinkedIn data. It allows users to enrich individual contacts or bulk lists with over 50 data points including contact information, LinkedIn profile details, and company firmographics.

## Authentication

All Wiza API requests require authentication using a Bearer token. Include your API key in the `Authorization` header of every request.

**Header format:**

```
Authorization: Bearer YOUR_API_KEY
```

To enable API access on your account, reach out to customer support at hello@wiza.co or via online live chat. Once enabled, navigate to Settings (under profile icon in top right corner). To access your API key, go to Settings > API.

**Base URL:** `https://wiza.co`

API access requires a paid Wiza plan (Starter, Explorer, or Pro) and is credit-based. Credits enable access to various endpoints and functionality within Wiza's API ecosystem.

## Features

### Individual Contact Enrichment

Enrich a single contact by providing identifying information and receive verified contact details in return. The Individual Reveal endpoint is used to fetch real-time details (emails, phones, firmographics) for a single person. The process is asynchronous — you submit a request and then retrieve results once processing completes (or receive them via webhook).

- **Input options (in order of accuracy):** LinkedIn profile URL (recommended), full name + company domain/name, or email address.
- **Enrichment levels:** `partial` returns emails, while `full` includes phone numbers as well.
- **Email options:** Configure whether to retrieve work emails, personal emails, or both via `accept_work` and `accept_personal` flags.
- Results include email verification status (valid, risky, etc.) and email type classification (work, personal).

### Phone Number Lookup

Find mobile phone numbers for contacts. Requires setting the enrichment level to `full` on an individual reveal request. Returns phone numbers with type classification (e.g., mobile) and formatted number.

### LinkedIn Profile Information Retrieval

Retrieve detailed LinkedIn profile data for a contact, including headline, bio, work history, job responsibilities, tenure at current company/role, skills, languages, certifications, education, premium account status, and open-to-work status.

### Company Enrichment

Retrieve company-level details including domain, industry, sub-industry, headcount, founding year, revenue, total funding, public/private status, last funding round details, headquarters location, and social media profiles (Twitter, Facebook, LinkedIn).

### Bulk Enrichment

Enrich multiple contacts by submitting individual reveal requests in parallel. Wiza can efficiently process large datasets. Whether you need to enrich 1,000 or 100,000 contacts, the API handles high-volume operations with reliable performance. Requests beyond the concurrency limit are queued automatically.

### Credit Balance

Check the remaining credit balance on your account via the API, including email credits, phone credits, and API-specific credits.

## Events

Wiza supports webhooks for receiving real-time notifications when enrichment requests complete.

### Enrichment Completion

Wiza sends a `POST` request to your configured webhook URL when an individual reveal finishes (successfully or with failure). The payload includes the full enrichment result data (or failure reason).

- **Default webhook URL:** Configure globally in Settings → API. You can optionally enable "Send All Callbacks" to receive webhooks for all enrichment activity on the account, not just API-initiated requests.
- **Per-request override:** Include a `callback_url` parameter in the individual reveal request to override the default webhook URL for that specific request.
- **Signature verification:** Webhook requests include an `x-auth-key` header containing a SHA256 hash of your API key, which can be used to verify the request originated from Wiza.
