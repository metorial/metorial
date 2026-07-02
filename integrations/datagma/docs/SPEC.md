Let me check the API reference for more details on authentication and endpoints.Now I have enough information to write the specification. Let me check on the Pipedream code example which showed the authentication pattern (`apiId` as a query parameter).

# Slates Specification for Datagma

## Overview

Datagma is a B2B data enrichment platform that provides real-time contact and company information. It offers APIs to find verified work emails, mobile phone numbers, enrich person/company profiles with 75+ data points, and detect job changes. Data is retrieved in real-time from the public web rather than from a stored database.

## Authentication

Datagma uses **API Key** authentication. You can obtain your API Key for free at https://app.datagma.com/. Navigate to your Datagma interface and on the left menu click on **API → Key & DOC**, then copy your API key (API ID).

The API key is passed as a query parameter named `apiId` on every request. For example:

```
https://gateway.datagma.net/api/ingress/v2/full?apiId=YOUR_API_KEY&...
```

No OAuth, tokens, or additional credentials are required. All plans include API access.

## Features

### Person & Company Enrichment

You can enrich an email address, a LinkedIn profile, or a full name with a company name to get info about the person and their company, or you can send a company name, website, or SIREN number to get only company info. Datagma enriches with more than 75 data points about the person and their company.

- **Person inputs**: LinkedIn URL, email address, or full name + company name.
- **Company inputs**: Company name, website URL, or SIREN number (for French companies).
- **Person data returned**: Name, job title, role, seniority, gender, education, past experiences, social profiles, and more.
- **Company data returned**: Industry, tags (B2B, B2C, SaaS), locations, employee count, technology used, social presence, and funding details.
- LinkedIn URL input gives nearly 100% match rate, full name + company is around 90%, and email is around 60%.

### Email Finding

The Find Email endpoint helps you find email based on a name, a company, or a LinkedIn URL. All emails are verified with Neverbounce and Usebouncer in real-time.

- **Inputs**: Full name and company name (or domain), optionally a LinkedIn company slug to improve accuracy.
- The `findEmailV2Step` parameter allows specifying if you want the full email (3) or the domain only (2).
- The `findEmailV2Country` parameter allows submitting the user's location to improve accuracy (e.g., regional domains like `jp.ibm.com`).
- Returns verified email addresses along with a validity score. Catch-all email addresses are flagged separately.

### Phone Number Search

Allows finding mobile phone numbers for contacts based on email address or LinkedIn URL.

- All numbers provided are certified Mobile Direct Line Phone Numbers.
- Can also verify if phone numbers are linked to a WhatsApp account.

### Reverse Lookup

Search for a person's profile based on a phone number or email address (outside EU).

- **Search by Phone Number**: Look up a person's identity from their phone number.
- **Search by Email**: Look up a person's identity from their email address. Limited to contacts outside the EU.

### Job Change Detection

The Job Change Detection endpoint tracks if a target is still working in the same company or if they have moved.

- **Inputs**: Person's name and their known company.
- Returns whether the person has changed jobs and provides updated employment information.
- Useful for CRM hygiene, churn risk detection, and re-engagement of warm leads.

### Find People at a Company

An endpoint to identify people with specific job titles in a list of companies.

- Allows searching for employees at a given company filtered by role or job title.
- Useful for prospecting and identifying decision-makers.

### Twitter Enrichment

You can enrich Twitter usernames with email, other social URLs, skills, interests, and much more.

- **Get Twitter by Username**: Retrieve profile data from a Twitter/X username.
- **Get Twitter by Email**: Look up a Twitter/X profile from an email address.

### Credit Balance

Allows retrieving the current credit balance available in your Datagma account.

## Events

The provider does not support events. Datagma's API is request-response based and does not offer webhooks or event subscription mechanisms for real-time notifications.
