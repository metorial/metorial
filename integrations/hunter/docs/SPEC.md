Let me get more details on the webhook events and authentication.# Slates Specification for Hunter

## Overview

Hunter (hunter.io) is a B2B data platform that provides email finding, email verification, and company/person enrichment services. It also offers lead management and email sequence (outreach campaign) capabilities, allowing users to discover professional contacts and automate cold email outreach.

## Authentication

Hunter uses API key authentication. You need to create an account on Hunter.io and generate an API key.

The API key can be passed in one of three ways:

- As a query parameter: `api_key=YOUR_API_KEY`
- In the `X-API-KEY` request header
- In the `Authorization` header with the format `Bearer YOUR_API_KEY`

API keys can be obtained for free by signing up on hunter.io. Keys can be retrieved, generated, or deleted from the [Hunter dashboard](https://hunter.io/api-keys).

A test API key (`test-api-key`) is available for testing purposes on the Domain Search, Email Finder, and Email Verifier endpoints. It validates parameters but always returns dummy data.

**Base URL:** `https://api.hunter.io/v2/`

No OAuth2 or other authentication methods are supported. There are no scopes — the API key grants access to all endpoints available on the user's plan.

## Features

### Company Discovery

Identify relevant companies programmatically at scale using natural language queries or structured filters. Filter by headquarters location, industry, headcount, company type, founding year, technologies used, funding details, and keywords. Supports AI-assisted natural language search (e.g., "US-based Software companies") that automatically maps to structured filters. Some filters (similar companies, technology, year founded, funding) require a Premium plan.

### Domain Search

Find all email addresses associated with a given domain. Results include contact details (name, position, department, seniority, phone number), email type (personal or generic), confidence scores, verification status, and web sources where the email was found. Results can be filtered by email type, seniority level, department, required fields, verification status, location, and job titles.

### Email Finder

Find a professional email address given a person's name and domain name, or their LinkedIn handle. Returns the email with a confidence score. Also returns verification status and sources if the email was found publicly on the web. A `max_duration` parameter (3–20 seconds) controls how long the system refines results.

### Email Verification

Verify the deliverability of any email address, with a confidence score. Returns detailed checks including regex validation, gibberish detection, disposable email detection, webmail detection, MX records, SMTP server connectivity, and accept-all status. Statuses include valid, invalid, accept_all, webmail, disposable, and unknown. Hunter focuses on B2B, so webmail addresses are not fully verified.

### Enrichment

Retrieve detailed profile information about a person or company:

- **Email Enrichment:** Given an email or LinkedIn handle, returns the person's name, location, employment details, social profiles (Twitter, LinkedIn, Facebook, GitHub), and more.
- **Company Enrichment:** Given a domain name, returns a rich company profile with email addresses, phone numbers, location data, technographics, and more. Includes industry classification (GICS, SIC, NAICS), tags, description, founding year, employee count, funding rounds, and tech stack.
- **Combined Enrichment:** Returns both person and company data for a given email address in a single call.
- A `clearbit_format` parameter is available to return data formatted in Clearbit's schema for compatibility.

### Email Count

Get the count of email addresses available for a domain or company, broken down by personal vs. generic emails, by department, and by seniority level. This is a free call useful for estimating data availability before using credits.

### Lead Management

Control the leads stored in Hunter, including fetching, adding, or deleting leads. Leads can be organized into lists, filtered by numerous attributes (email, name, company, industry, verification status, sending status, etc.), and enriched with custom attributes. Supports create, read, update, upsert (create or update by email), and delete operations. Custom attributes can also be managed via the API.

### Leads Lists

Create and manage lists to organize leads. Lists can be created, renamed, and deleted. Leads can be assigned to one or multiple lists.

### Email Sequences

Review sequences and add or remove recipients. Available operations include listing all sequences, listing recipients of a sequence, adding recipients (by email or lead ID), canceling scheduled emails to specific recipients, and starting a draft sequence. Adding a recipient to an active sequence may trigger immediate email sending. Not all sequence endpoints are publicly available yet.

### Company Logos

Retrieve any company's logo by domain name, completely free. No authentication is required; returns the image directly. Accessed via `https://logos.hunter.io/{domain}`.

### Account Information

Retrieve details about the authenticated Hunter account, including plan name, credit usage, and available searches/verifications. This call is free.

## Events

Hunter supports webhooks as notifications about various events that occur for emails sent in Hunter Sequences. Webhooks send a POST request to a configured URL when a specified event occurs.

### Sequence Email Events

The following event types are available for email sequences:

- **Email Sent** — Triggered when an email in a sequence is sent to a recipient.
- **Email Opened** — Triggered when a recipient opens an email sent from a sequence.
- **Link Clicked** — Triggered when a recipient clicks a link in a sequence email.
- **Email Replied** — Triggered when an email sent within the campaigns gets a reply.

Webhooks can be configured as default webhooks (automatically applied to all new sequences) or per individual sequence. One webhook can be created per event type. Per-sequence webhooks can only be configured after the sequence has been launched, via the Integration tab within the sequence.

Note: Sequence webhooks are not available on Data Platform plans.
