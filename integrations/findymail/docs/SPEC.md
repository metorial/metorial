Let me fetch the actual API documentation for more details.Now let me check for more details on Findymail's contact lists management and webhook support.I now have enough information to write the specification.

# Slates Specification for Findymail

## Overview

Findymail is a B2B email and phone data enrichment service that finds and verifies professional email addresses, phone numbers, and company information. It provides a REST API for programmatic access to email finding, email verification, reverse email lookup, company enrichment, employee search, and AI-powered lead discovery.

## Authentication

All API requests require a Bearer token passed in the `Authorization` header. You can get your API key instantly from your dashboard after signing up.

In the Findymail dashboard, navigate to the API section, name a new API key, and click "Create" to generate it.

**Authentication method:** API Key (Bearer Token)

- **Header:** `Authorization: Bearer YOUR_API_KEY`
- **Content-Type:** `application/json`
- **Base URL:** `https://app.findymail.com/api`

No OAuth or additional scopes are required. A single API key provides access to all available API endpoints.

## Features

### Email Finder

Find someone's verified email from their name and company. You provide a full name and a company domain (or company name), and Findymail returns a verified email address. Email Finder works from names, domains, or social profile URLs, and every email is automatically verified as it is found.

- Duplicate searches are free.
- It doesn't return risky or invalid catch-all emails — only safe, verified results.

### Email Verification

Verify any email address for deliverability. Returns verification status and email provider. Email Verifier is for checking lists you already have — data you bought elsewhere or exported from your CRM. Upload your list and it will tell you which emails are safe to use.

### Reverse Email Lookup

Find a LinkedIn profile from an email address. Uses 1 credit without profile data, 2 credits with full profile enrichment. Returns details such as full name, headline, job title, and company name. The `with_profile` parameter controls whether full profile enrichment is included.

### Phone Number Finder

Find direct phone numbers from LinkedIn profiles. Requires a LinkedIn profile URL as input. GDPR compliant — excludes EU citizens.

### Company Enrichment

Get company information from LinkedIn URL, domain, or name. Returns data such as company name, domain, company size, and industry.

### Employee Search

Find employees at a company by website and job title. Returns LinkedIn profiles.

### AI-Powered Lead Search (IntelliMatch)

Find companies and contacts using natural language queries. Build targeted lead lists automatically. You can provide a plain-English query (e.g., "SaaS companies in US") along with configuration options to also find contacts and their emails in the same request.

- Configurable options include `find_contact` and `find_email` flags and a `limit` parameter.

### Contact Lists Management

Get a list of all contact lists in Findymail. The API allows you to manage and retrieve saved contacts and lists within your Findymail account.

### Credits Balance

The API exposes an endpoint (`/api/credits`) to check your current account credit balance programmatically.

## Events

Findymail mentions webhook support for async operations. However, based on available documentation, there is no detailed specification of subscribable webhook event types or a webhook management API. The provider does not appear to offer a purpose-built event subscription system with defined event categories that can be configured programmatically through the API.
