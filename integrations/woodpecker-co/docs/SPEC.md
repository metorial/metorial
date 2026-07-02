Now let me get more details on the features available:Now let me check the remaining features - inbox, mailboxes, reports, blacklist, manual tasks, and LinkedIn accounts:I now have sufficient information to write the specification. Let me compile it.

# Slates Specification for Woodpecker Co

## Overview

Woodpecker.co is a B2B cold email and LinkedIn outreach automation platform. It enables users to send personalized email sequences and LinkedIn actions automatically, track prospect engagement (opens, clicks, replies), and manage prospect databases. It also offers agency-level features for managing multiple client accounts.

## Authentication

Woodpecker uses **API key-based authentication**. All requests must include the API key in the `x-api-key` header.

**Generating an API key:**

1. Log into Woodpecker at `app.woodpecker.co`
2. Navigate to Add-ons → API & Integrations → API keys
3. Click "Create a key" and optionally add a label

API key access requires the "API keys & integrations" add-on, which is also available to trial users.

**Base URL:** `https://api.woodpecker.co/rest`

**Example request:**

```
curl --request GET \
  --url "https://api.woodpecker.co/rest/v1/me" \
  --header "x-api-key: {YOUR_API_KEY}"
```

**Agency accounts** have additional authentication options:

- Use a dedicated API key per client account, or
- Use the HQ (headquarters) API key with an `x-company-id` header to specify which client account to act on behalf of

## Features

### Campaign Management

Create, configure, and manage multichannel outreach campaigns consisting of email and LinkedIn steps. Campaigns support multi-step sequences with configurable delays between steps, A/B testing (up to 5 versions per step), delivery time windows per day of week, timezone-aware sending, open/click tracking, unsubscribe options, and catch-all email verification modes. Campaign statuses can be changed (run, pause, stop, make editable). Individual steps can be added, updated, or deleted.

- LinkedIn steps support profile visits, connection requests, and direct messages.
- Campaigns with IF conditions, scheduled starts, or manual task steps are not supported via API.

### Prospect Management

Add, update, search, and retrieve prospects in the global database or within specific campaigns. Prospects include contact fields (name, email, company, phone, etc.) and custom snippet fields. Each prospect has a global status (e.g., ACTIVE, BLACKLIST, REPLIED, BOUNCED, INVALID) and per-campaign statuses and interest levels (INTERESTED, NOT_INTERESTED, MAYBE_LATER). Prospect responses (replies) can be retrieved.

### Inbox

Retrieve messages received in the Woodpecker inbox and reply to prospect emails directly through connected mailboxes.

### Mailbox Management

View and manage connected email accounts (SMTP mailboxes) used for sending campaign emails.

### LinkedIn Account Management

View connected LinkedIn accounts used for LinkedIn campaign steps.

### Blacklist Management

Manage blacklisted domains and email addresses to prevent outreach to specific contacts or organizations.

### Manual Tasks

Retrieve manual tasks created for prospects within campaigns. Tasks can be marked as done or ignored.

### Reports

Generate predefined campaign performance reports including complete statistics per campaign step, general campaign statistics, sent message counts, and open rates. Reports are generated asynchronously — you request generation and then fetch results using a report hash.

### User Management

Retrieve users associated with the Woodpecker account.

### Agency Management

For agency accounts: manage multiple client accounts from a single HQ account. Create client accounts, generate API keys for clients, manage agency-wide blacklists, and access cross-account reporting and deliverability statistics.

## Events

Woodpecker supports **webhooks** for event notifications. You subscribe to events by providing a target URL and event name. Notifications are triggered at the account level across all campaigns. Up to 5 subscriptions per event are allowed (each with a unique target URL). Events are delivered via HTTP POST and may be batched (up to 100 events per payload).

### Prospect Status Events

- **prospect_replied** — When a prospect's reply is detected or status is manually changed to RESPONDED.
- **prospect_bounced** — When a bounce is detected or status is changed to BOUNCED.
- **prospect_invalid** — When a prospect's email is marked as INVALID.
- **prospect_autoreplied** — When an autoreply is detected or status is changed to AUTOREPLIED.
- **prospect_blacklisted** — When a prospect's status is updated to BLACKLISTED.
- **prospect_opt_out** — When a prospect unsubscribes or status is changed to OPT_OUT.
- **prospect_non_responsive** — When a prospect's campaign status changes to NON_RESPONSIVE.
- **prospect_saved** — When a new prospect is added or an existing one is updated.

### Prospect Interest Events

- **prospect_interested** — When a prospect's interest level is set to INTERESTED.
- **prospect_maybe_later** — When a prospect's interest level is set to MAYBE_LATER.
- **prospect_not_interested** — When a prospect's interest level is set to NOT_INTERESTED.

### Engagement Events

- **email_opened** — When a prospect opens an email.
- **link_clicked** — When a prospect clicks a tracked link in an email.
- **secondary_replied** — When a secondary response is detected from a prospect.

### Campaign Events

- **campaign_sent** — When a campaign email is sent to a prospect.
- **campaign_completed** — When a campaign status changes to COMPLETED.
- **followup_after_autoreply** — When a follow-up is scheduled after receiving an autoresponse.

### LinkedIn Events

- **prospect_li_cr_accepted** — When a LinkedIn connection request is accepted by a prospect.

### Task Events

- **task_created** — When a manual task is created for a prospect.
- **task_done** — When a manual task is marked as done.
- **task_ignored** — When a manual task is marked as ignored.
