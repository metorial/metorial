Let me get more details on the webhook event types and the full API feature set.Now let me look at the Pipedream source to understand the specific webhook event types Reply.io supports:Based on the research, I have enough information to compile the specification. Let me also check what the older V1 webhook supported from the Pipedream events I saw earlier.

# Slates Specification for Reply.io

## Overview

Reply.io is a multichannel sales engagement platform that automates outreach across email, LinkedIn, calls, SMS, and WhatsApp. It provides tools for managing contacts, building outreach sequences (campaigns), tracking engagement, and analyzing campaign performance. The platform also includes a B2B contact database and AI-powered features for sales development.

## Authentication

Reply.io uses **API Key** authentication.

### Obtaining the API Key

To gain access to the API, log into your Reply account, navigate to `Settings`, and find and copy your API key under `API Key`.

### Using the API Key

The API key is passed in the `X-API-Key` header with each request.

Example:

```
X-API-Key: AKp2BbuyfS-ugPMkBmd3sg2
```

### Master API Key (Beta)

The Master API Key provides centralized access to Reply API across all supported versions (V1 and V2). It is designed for team-level authentication and allows acting on behalf of specific users within a team.

The Master API Key is available only when Team Edition (TE) is ON, including private teams, public teams, and organizations. It is not available when Team Edition is OFF.

### API Versions

The platform utilizes the endpoint `api.reply.io` and offers two versions of the API: V1 and V2, each with unique functionalities. Both versions can be used in tandem. A newer V3 is also available for webhook management.

## Features

### Sequence (Campaign) Management

Create, configure, and manage multichannel outreach sequences. Manage campaigns: create, schedule, and organize email campaigns. Sequences can include email steps, LinkedIn messages, calls, SMS, and WhatsApp steps. You can list, retrieve details of, and delete campaigns.

- Campaigns can be filtered by name when listing.
- Contacts can be added to existing campaigns but campaigns cannot always be created directly via all integration paths.

### Sequence Steps Management

Define and manage the individual steps within a sequence, including the type of action (email, LinkedIn, call, etc.), content/templates, and delays between steps.

### Contact Management

Add, update, or remove contacts and track campaign progress. Contacts can be searched by email address, pushed to campaigns, marked as replied, or marked as finished.

- Email address is the primary identifier for contacts.
- Contacts support custom fields, including City, State, LinkedIn URL, and any additional custom fields defined in the account.
- Contacts can be added to or removed from specific campaigns/sequences.

### Contact Lists

Organize contacts into lists within your workspace. You can create, retrieve, and manage lists for segmentation purposes.

### Email Account Management

Retrieve all email accounts with their current status. You can filter by active or inactive status, making it easy to spot accounts that need attention before they impact campaign deliverability.

### Templates

Use pre-designed email templates to simplify outreach. Templates can be listed and retrieved via the API for use within sequences.

### Blacklist Management

Manage a blacklist of email addresses or domains to prevent outreach to specific contacts.

### Task Management

Create and manage tasks such as calls, meetings, to-dos, SMS, and manual emails. Tasks can be assigned to team members and are tied to contacts and sequences.

### Statistics and Reports

Access campaign and contact statistics to see opens, clicks, and replies. Use this data to improve results. Reports provide performance analytics across channels including email, LinkedIn, calls, and SMS.

### Branded Links

Manage custom tracking links (branded links) that can be matched to sending domains for improved deliverability.

### Schedules

Configure sending schedules that control when sequence steps are executed, including time zones and availability windows.

### Account Management

Manage user accounts and team settings. Set up new users and control their access to campaigns and contacts. Manage permissions to keep your team organized and productive.

## Events

Reply.io supports webhooks for real-time event notifications. Webhooks are managed via the V3 API and can be configured with subscription levels scoped to sequence, account, team, or organization.

Webhook subscriptions accept a target URL, a list of event types, and an optional HMAC secret for request signing.

### Email Events

Notifications related to email activity within sequences:

- **Email Sent** – Triggered when a new email is sent (first step or follow-up).
- **Email Replied** – Triggered when a prospect replies to an email.
- **Email Opened** – Triggered when a prospect opens an email.
- **Email Clicked** – Triggered when a prospect clicks a link in an email.
- **Email Bounced** – Triggered when an email address bounces (soft and hard).

### Contact Events

Notifications related to contact lifecycle changes:

- **Contact Added** – Triggered when a new contact is added.
- **Opt Out** – Triggered when a person clicks the opt-out link.
- **Contact Finished** – Triggered when a prospect finishes in terms of a campaign.

### Subscription Scoping

Webhooks can be scoped to specific sequence IDs; if empty or null, they apply to all sequences when subscriptionLevel is 'sequence'. Similar scoping applies for team-level and organization-level subscriptions.

- **subscriptionLevel** options: `sequence`, `account`, `team`, `organization`.
- Scope defaults to 'account' if not specified.
