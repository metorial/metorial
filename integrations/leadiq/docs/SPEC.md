Now I have comprehensive information. Let me compile the specification.

# Slates Specification for LeadIQ

## Overview

LeadIQ is a B2B sales prospecting and data enrichment platform that provides access to professional contact and company information. Its API allows querying verified email addresses, phone numbers, job positions, company firmographics, technographics, and funding data for millions of contacts and accounts. The API uses GraphQL and is credit-based.

## Authentication

Authentication is performed via HTTP Basic authentication. Provide your API key as the username value. You do not need to provide a password.

**Getting your API key:**
You'll need an API key, which can be found within your LeadIQ account in Settings > API Keys. Choose the Secret Base64 API key.

**GraphQL Endpoint:**
`https://api.leadiq.com/graphql`

**Example:**

```
curl -X POST https://api.leadiq.com/graphql \
  -u YOUR_API_KEY: \
  -H "Content-Type: application/json" \
  -d '{"query": "{ account { plans { name status } } }"}'
```

Note the trailing colon after the API key (empty password field in Basic auth).

**Access tiers:**

- Users across all plans can make up to 50 one-off, non-recurring calls to test the API.
- Beyond the free tier, API access requires a direct sales discussion for enterprise-level agreements.

## Features

### Contact Search

Find a single person based on identifying information such as person name and current (or past) companies, LinkedIn profile, or work/personal email. Additional search inputs include phone number, hashed email (SHA256), and LeadIQ person ID.

- Results include current and past positions with associated work emails and phones, personal emails and phones, LinkedIn profile, other social profiles, education history, and location.
- Each email and phone includes a verification status (Verified, VerifiedLikely, Unverified, Invalid, Suppressed).
- You can filter results to only include contacts with verified work emails, specific email statuses, or specific contact info types (e.g., `HasVerifiedWorkPhone`, `HasPersonalEmail`).
- A `minConfidence` parameter (0–100) allows filtering by match confidence.
- A `qualityFilter` option lets you control phone number quality levels (AllPhones, HigherQualityPhones, HighestQualityPhones).

### Company Search

Find a single company based on name, domain, country, or LinkedIn URL.

- Returns detailed company information including alternative names, description, industry, employee count/range, location details, logo, technologies used, revenue range, funding info (rounds, total funding, last funding details), SIC/NAICS codes, social URLs, founded year, company hierarchy (parent/ultimate parent), and department function trends over time.

### Advanced People Search

Find a list of people based on broad search criteria such as job title, seniority, role, company size, location, etc.

- Two response formats available:
  - **Grouped search**: results are grouped by company.
  - **Flat search**: results returned as a flat list.
- **Contact filters**: filter by name, title, LinkedIn ID/URL, seniority level (VP, Manager, Director, Executive, SeniorIndividualContributor), role, location, email verification status, update date range, new hire date, and new promotion date.
- **Company filters**: filter by company name, domain, LinkedIn ID, industry, employee size range, location, description, technologies, technology categories, revenue ranges, funding info, and NAICS/SIC codes.
- Both contact and company filters support exclusion filters to omit specific results.
- Results can be sorted by various fields (name, title, seniority, role, updated date, etc.).

### Account & Credit Management

You can make utility calls like viewing your API credits. The account query returns plan details including plan name, product type, status, next billing period, available credits, used credits, and per-data-point cost breakdowns.

### Data Feedback

Submit corrections to person contact data. You can report an email or phone as correct or invalid, specify the invalid reason (e.g., specific email bounce codes, wrong person), and provide the type of contact info being corrected.

## Events

The provider does not support events. LeadIQ's API is a query-only GraphQL API focused on data retrieval and does not offer webhooks or event subscription mechanisms.
