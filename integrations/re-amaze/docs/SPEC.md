Let me get more details on the Re:amaze API features and webhooks.Let me look for Re:amaze's specific webhook support in their own documentation/help center.Based on my research, I now have enough information to write the specification. Re:amaze does not appear to have a native webhook/event subscription system in its API. The Zapier triggers are polling-based (scheduled, not instant), and the only webhooks I found are specific to custom SMS channel integrations, not general-purpose event subscriptions.

# Slates Specification for Re:amaze

## Overview

Re:amaze is a customer service and helpdesk platform that consolidates email, live chat, social media, SMS, and other communication channels into a single dashboard. It provides conversation management, contact management, FAQ/knowledge base, status page incident tracking, reporting, and AI-powered support features.

## Authentication

All authentication is performed via HTTP Basic Auth. Re:amaze API access is available only through SSL/HTTPS.

To authenticate, you need the following credentials:

- **Login Email**: The email address associated with your Re:amaze account.
- **API Token**: Every user within an account has their own individual token. This allows the Re:amaze API to act on behalf of a specific user within your account.
- **Brand Subdomain**: API requests are scoped by Brand, which is identified by the host of the API endpoint. Each Re:amaze account may contain one or more brands and each brand's host domain can be found from the Brand Settings Page.

**Generating an API Token:**

1. Go to Settings within your Re:amaze account. Click "API Token" under Developer. Click "Generate New Token" to generate a unique token.

**Request format:**

The API base URL follows the pattern `https://{brand}.reamaze.io/api/v1/`. The login email is used as the username and the API token as the password in HTTP Basic Auth. For example:

```
curl 'https://{brand}.reamaze.io/api/v1/conversations' \
  -H 'Accept: application/json' -u {login-email}:{api-token}
```

There is no OAuth2 support. No scopes are available — the token provides full access on behalf of the associated user.

## Features

### Conversation Management

Create, retrieve, update, and search support conversations. Conversations can be assigned to specific staff members, categorized by channel (e.g., support, email), filtered by status (open, pending, resolved), and tagged. You can also add messages (replies or notes) to existing conversations on behalf of staff or customers.

### Contact Management

Create, retrieve, and update customer contact records. Contacts can have multiple identities (e.g., email addresses, social accounts). You can also manage contact notes — create, update, retrieve, and delete notes attached to individual contacts.

### Knowledge Base (Articles)

Create, retrieve, and update FAQ/help articles. Articles can be organized and managed programmatically to power self-service customer support.

### Channels

Retrieve available support channels and their details. Channels represent the different communication methods (email, chat, social, SMS, etc.) configured for a brand.

### Response Templates

Create, retrieve, and update pre-written response templates that staff can use to quickly reply to common questions.

### Staff Management

Retrieve staff members and create new staff user accounts within your Re:amaze account.

### Reports

Access support analytics including:

- **Volume**: Daily conversation volume counts.
- **Response Time**: Daily response time metrics and summaries (reported in seconds).
- **Staff**: Staff performance metrics and summaries.
- **Tags**: Tag usage reports.
- **Channel Summary**: Aggregated metrics broken down by channel.

Reports can be filtered by date range.

### Status Page / Incidents

Create, retrieve, and update incidents for your public-facing status page. You can also retrieve the systems being monitored. This allows programmatic management of service status communication.

### Satisfaction Ratings

Retrieve customer satisfaction ratings collected through Re:amaze's feedback system.

## Events

The provider does not support events. Re:amaze does not offer a native webhook subscription system or event streaming mechanism through its API. Third-party platforms like Zapier integrate with Re:amaze using scheduled polling rather than real-time webhooks.
