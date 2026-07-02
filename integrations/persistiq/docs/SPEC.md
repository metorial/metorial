The API docs page seems to be down. Let me search for more details.Let me try to access the archived version of the PersistIQ API docs and search for Zapier triggers to understand webhook/event support.Now let me try to access the Wayback Machine version of the API docs.The Airbyte docs don't list the specific streams. Let me check the Airbyte source code to see what streams are available.I now have enough information to write the specification. Let me compile what I've gathered.

# Slates Specification for Persistiq

## Overview

PersistIQ is a sales engagement platform that automates outbound sales processes including personalized email campaigns, multi-channel outreach sequences (email, calls, LinkedIn, tasks), follow-up automation, and lead management. It allows users to automate personalized emails, calls, and tasks, A/B test messages, analyze results, and sync data with CRMs. The API base URL is `https://api.persistiq.com/v1`.

## Authentication

PersistIQ uses API key-based authentication. PersistIQ uses token-based authentication to control access to the API. To authenticate, you need to obtain an `X-API-Key`.

You can find this key under **Profile > Integrations > PersistIQ API** in the PersistIQ dashboard. Alternatively, from the bottom left corner, click your profile button and go to **Settings and Billing > Integrations**. Your API key will be listed there.

The API key must be passed as an `x-api-key` HTTP header with every request. The authentication method is Header Token.

Example:

```
GET /v1/leads HTTP/1.1
Host: api.persistiq.com
x-api-key: YOUR_API_KEY
```

No OAuth or additional scopes are required. There is a single API key per account.

## Features

### Lead (Prospect) Management

Allows listing leads, viewing a single lead, creating leads, and updating leads. Lead data includes fields such as email, first name, last name, company name, industry, title, and custom fields. Leads have associated metadata like status (e.g., replied), bounce status, opt-out status, sent count, reply count, and last sent timestamp. You can also retrieve all lead statuses and all lead fields configured for your company.

- Leads can be assigned to specific users (owners) via a `creator_id` parameter.
- It allows sales teams to import lead lists, create custom database fields, and detect duplicate leads.

### Campaign Management

You can list, create, and delete campaigns. Campaigns represent outreach sequences. You can add or remove a lead from a campaign through the campaigns endpoint. When adding a lead to a campaign, a `mailbox_id` parameter is required to specify which mailbox to use for sending.

### User Management

You can list users in the account. This allows you to retrieve team member information for lead assignment and reporting purposes.

### Do Not Contact Management

You can add domains to a Do Not Contact list to prevent outreach to specified domains. This helps maintain compliance and avoid contacting companies that should be excluded from campaigns.

### Prospect Status Updates

You can update the status of a prospect. Statuses must already be configured in the PersistIQ dashboard before they can be set via the API.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms through its API. PersistIQ's Zapier integration offers polling-based triggers for when a new prospect is created and when a prospect is updated, but these are Zapier-specific polling mechanisms rather than native webhook or event subscription capabilities provided by the PersistIQ API itself.
