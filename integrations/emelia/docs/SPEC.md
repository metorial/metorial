Now let me check the LinkedIn campaigns and scrapper sections, and the email providers section for more details.Now let me check the webhook creation details and the scrapper webhook to understand events better.Now I have enough information to write the specification. Let me compile it.

# Slates Specification for Emelia

## Overview

Emelia is a B2B prospecting platform that provides cold email outreach, LinkedIn automation, email finding/verification, phone number finding, LinkedIn Sales Navigator scraping, and email warmup. It supports multi-channel campaigns combining email and LinkedIn, with built-in deliverability tools and a unified inbox for managing replies.

## Authentication

Emelia uses API key authentication. The API key must be passed in the `Authorization` header of each request.

- **Type:** API Key
- **Header:** `Authorization`
- **Obtaining the key:** The API key can be found in your Emelia account settings at `https://app.emelia.io/settings/api`.

Example header:

```
Authorization: your-api-key-here
```

No OAuth flow or additional scopes are required. All API features are accessible with a single API key tied to the authenticated user's account.

## Features

### Email Campaigns

Create and manage cold email campaigns, including adding/removing contacts, managing contact lists, configuring campaign steps (email sequences), starting and pausing campaigns, and sending test emails. You can update campaign settings such as global configuration, provider settings, campaign name, and multi-step sequences. Campaign activity logs and statistics (opens, clicks, replies) can be retrieved. Contacts can be blacklisted at the account level. Custom fields can be set on individual contacts. Replies can be sent directly through the API via Emelia's merged inbox.

### LinkedIn Campaigns

Create and manage LinkedIn outreach campaigns, including adding/removing contacts, managing LinkedIn contact lists, configuring campaign steps, and updating campaign settings. Campaign activities and statistics can be retrieved. Custom fields can be set on LinkedIn contacts.

### Advanced Campaigns

Advanced campaigns support multi-channel workflows combining email and LinkedIn in a single campaign. They offer the same contact and list management features, plus manual task management — you can retrieve pending manual tasks for a campaign and update their status. Campaign activities and statistics are available.

### Email Finding and Verification

Find the professional email address of a single contact by submitting a job, then retrieve the result. You need the prospect's full name, company name, website, and country to find verified emails. Email verification is also available as a separate tool to validate existing email addresses. These operations are asynchronous (job-based); you submit a request and poll for the result. Uses credit-based billing — credits are only consumed when an email is found.

### Phone Number Finding

Find the phone number of a single contact by submitting a job and retrieving the result asynchronously. This also uses the credit-based system.

### Email Provider Management

List, add, and manage email sending providers (mailboxes) connected to your Emelia account. You can enable or disable email warmup for each provider to build and maintain sender reputation.

### LinkedIn Scraping

Create and manage LinkedIn Sales Navigator scrapers to extract contact data at scale. Scrapers can be created, paused, resumed, renamed, split, and deleted. You can start enrichment on scraped data (to find emails/phones) and download the resulting data. LinkedIn authentication configurations can be managed separately (list and create credentials).

## Events

Emelia supports webhooks for monitoring campaign activity and scraper completion.

### Campaign Activity Webhooks

Webhooks can be created to watch activity for a specific campaign. Supported events include email opens, email clicks, and email replies. Webhooks are configured per campaign with a target URL. You can list, create, delete, and test webhooks via the API.

### LinkedIn Scraper Webhooks

Webhooks can be added to a LinkedIn scraper, with "FINISHED" and "ERROR" events available. The webhook is called via POST with the scraper name, ID, event type, and error details if applicable. Webhooks can be added to or removed from individual scrapers.
