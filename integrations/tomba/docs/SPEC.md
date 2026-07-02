# Slates Specification for Tomba

## Overview

Tomba is a B2B email finder and verifier platform that provides access to a database of over 430 million professional email addresses across millions of domains. Tomba.io is a solution for discovering, verifying, and managing professional email addresses, designed for sales, marketing, and recruitment professionals. It offers email discovery, verification, enrichment, phone finding, and lead management capabilities via a REST API.

## Authentication

Authentication is made with an API key and secret that must be added to every API call. Both parameters are always required, and Tomba will return an error if either is missing or invalid. The key and secret identify your account, so they must be kept confidential.

Both credentials are passed as HTTP headers:

- `X-Tomba-Key` — Your API key (prefixed with `ta_`)
- `X-Tomba-Secret` — Your API secret (prefixed with `ts_`)

Example:

```
X-Tomba-Key: ta_xxxx
X-Tomba-Secret: ts_xxxx
```

You can generate or delete API keys and reset secrets at any time from the Secret Key section of your account dashboard.

API keys can be obtained by signing up for a free account at `https://app.tomba.io/auth/register`. The base URL for all API requests is `https://api.tomba.io/v1`.

There are no OAuth flows or scopes. Authentication is solely key/secret-based.

## Features

### Domain Search

Requires a domain name and returns a set of data about the organization, along with the email addresses found and additional information about the people owning those email addresses.

- Can filter results by department or seniority.
- Can also search by company name, though providing a domain yields better results.

### Email Finder

Requires the name of a person and a domain name. Returns the professional email of that person and a confidence score. If the email address is displayed somewhere online, the sources are also returned.

- Accepts first name, last name (or full name), and domain as inputs.

### Email Verifier

Requires an email address. Returns the verification result to check if the email address is deliverable or not, with detailed validation checks and a confidence score.

### Author Finder

Requires an online article URL. Returns the author's name, email address, and confidence score.

### LinkedIn Finder

Allows finding professional emails using just a LinkedIn profile URL.

### Email & Domain Enrichment

Lets you look up person and company data based on an email. For example, you could retrieve a person's name, location, and social handles from an email.

- Returns data such as name, company, position, social profiles (Twitter, LinkedIn), gender, country, and more.

### Phone Finder

Discover phone numbers linked to domains or emails. Get company and contact-level numbers, with validation for accuracy.

- Can search by email, domain, or LinkedIn URL.

### Domain Intelligence

- **Email Count**: Returns the total number of email addresses known for a domain, broken down by department (engineering, finance, HR, etc.) and seniority (junior, senior, executive).
- Retrieve the email format patterns used by a specific domain.
- **Domain Status**: Check whether a domain is a webmail provider or disposable.
- Retrieve similar domains based on a specific domain.
- Retrieve the technologies used by a specific domain.
- **Employee Location**: Get employee location data based on a domain.

### Lead Management

Fetch leads based on company, industry, or location filters. Search leads using smart filters, export lead data to your CRM, and segment by industry, size, role, etc.

- Full CRUD operations on leads: create, read, update, and delete individual leads.
- Filter leads by domain.

### Lead Lists

Create and manage groups of leads for campaign targeting. Organize leads by project or region, and share lists across your team.

- Create, update, and delete lead lists.

### Account & Usage

- Retrieve account information including subscription, settings, and usage data.
- Track API consumption and usage limits. Visualize API call history.
- View activity logs for API events and account changes, including login, API, and team events.
- Manage API keys (generate, revoke).

## Events

Webhooks allow external services to be notified when certain events occur in the system. Tomba supports webhooks to receive notifications when a lead is saved.

### Lead Saved

- Triggered when a lead is saved in Tomba.
- Your webhook receives a POST request with a JSON payload containing the lead's details including email, company, first name, last name, phone, website, position, Twitter, LinkedIn, notes, and score.
- You configure a webhook URL to receive these notifications.
