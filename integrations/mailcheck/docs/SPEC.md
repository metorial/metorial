There are multiple services with similar names. Let me clarify which "Mailcheck" is being referred to. The most prominent one appears to be **Mailcheck.co** — a popular email verification service. Let me get more details on its API.Given the n8n integration reference and the broader context, the "Mailcheck" provider most likely refers to **Mailcheck.co**. Let me get more specifics on its API.Now I have a clear picture. The Pipedream integration confirms the API base is `https://api.mailcheck.co`. Let me fetch the actual API docs.Let me check the n8n docs for Mailcheck which should confirm the API details.Now I have a clear picture. Mailcheck (mailcheck.co) is confirmed. Let me check their API docs link.I have enough information from the search results and the Pipedream/n8n integrations to write the specification.

# Slates Specification for Mailcheck

## Overview

Mailcheck (mailcheck.co) is an email verification and validation service that checks whether email addresses are valid, deliverable, and trustworthy. It validates emails using data from public sources, social networks, and open databases, providing a trust score for each email. It supports both single email verification and bulk list cleaning via file upload or API.

## Authentication

Mailcheck supports a single authentication method:

- **API Key**: Create a Mailcheck account, open the Mailcheck dashboard page, click on "API" on the top menu, enter a key name, and click the "Create Key" button.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

Base URL: `https://api.mailcheck.co/v1`

Example request:

```
GET https://api.mailcheck.co/v1/emails/operations
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Features

### Single Email Verification

Quick validation allows you to verify a single email without loading a complete CSV file, providing results immediately. The verification returns a trust score indicating the likelihood that the email is valid and deliverable.

- Emails with a trust rate of 0–49% are considered risky and most likely invalid; emails with a trust rate of 50–100% are considered valid.
- Verification retrieves data from social networks and many other sources to assign a score to a specific email, going beyond simple MX checks.

### Bulk Email List Verification

Upload CSV files containing email lists for batch validation. Mailcheck can process up to 1,000,000 email addresses in approximately 15 minutes.

- Requires specifying a delimiter (comma) and selecting the email column.
- Results are available via the dashboard and email notification, with a downloadable file. Results can be downloaded by clicking the "Download" button.

### Batch Check Operations

The API supports checking the status of batch/bulk verification operations, allowing you to programmatically submit lists and poll for completion.

### Third-Party Platform Integrations

Mailcheck offers integration with Mailchimp, Zapier, WordPress, Make.com (ex Integromat), n8n, SendGrid, MailerLite, Woodpecker, and ActiveCampaign.

- For platforms like MailerLite and ActiveCampaign, Mailcheck connects directly via their API keys to pull and validate subscriber lists.
- For MailerLite, you can choose to validate only new contacts or all contacts, and results (status, score, date) are synced back to your MailerLite account as custom fields.

## Events

The provider does not support events. Mailcheck does not offer webhooks or purpose-built event subscription mechanisms through its API.
