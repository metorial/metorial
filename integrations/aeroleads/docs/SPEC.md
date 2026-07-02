# Slates Specification for Aeroleads

## Overview

AeroLeads is a B2B lead generation platform that provides a database of over 750 million prospect records, allowing users to find business emails, personal emails, and phone numbers. AeroLeads offers 2 APIs: a LinkedIn API to extract complete profile data by providing a LinkedIn URL, and an Email API that returns a prospect's business email when given their name and company domain.

## Authentication

AeroLeads uses API key authentication. To use the API, you need an API key. After logging into your AeroLeads account, go to the Settings Page to find your API key.

Go to Settings while being logged in to your AeroLeads account. Click on the API tab and copy the API key from your account.

The API key is passed as a query parameter named `api_key` on every GET request. For example:

```
https://aeroleads.com/api/get_linkedin_details?linkedin_url=linkedin.com/in/example&api_key=YOUR_API_KEY
```

There are no OAuth flows, scopes, or additional credentials required. The single API key is tied to your account and its credit plan.

## Features

### LinkedIn Profile Lookup

With AeroLeads LinkedIn API, you can get information of all LinkedIn users including their emails and phone numbers. You can send a LinkedIn profile URL and get all the details of that person like their name, job title, current company, previous company, education, skills, etc.

- **Required parameter:** `linkedin_url` — the LinkedIn profile URL of the prospect.
- Returns verified emails, phone numbers, job titles, and more.

### Email Finder

Get the email of a prospect using first name, last name, and company URL. The endpoint is `https://aeroleads.com/api/get_company_email`.

- **Required parameters:** `first_name`, `last_name`, and `company` (the company domain).
- Results include a confidence status: 1.0 for confirmed email, 0.5 for server accepts all pings (email may be right), and 0.1 for unsure.
- Each API call consumes 1 credit. Credit usage works like normal AeroLeads usage; when out of credits, you can buy or upgrade your credit plan.

### Legacy Email Finder

An older endpoint at `https://aeroleads.com/apis/details` also allows finding emails using `first_name`, `last_name`, and `company_url` parameters. It returns multiple possible email addresses with confidence scores. This appears to be an earlier version of the Email Finder API.

## Events

The provider does not support events. AeroLeads does not offer webhooks, event subscriptions, or any built-in push notification mechanism through its API.
