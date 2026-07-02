Let me get more details on the API reference to understand the full feature set and webhook events.Now I have comprehensive information about UniOne's API. Let me compile the specification.

# Slates Specification for Unione

## Overview

UniOne (unione.io) is a transactional email service that provides an API for sending transactional and marketing emails. It offers email delivery with tracking, template management, domain verification, suppression list management, and real-time event notifications via webhooks.

## Authentication

UniOne uses **API key** authentication. Every API method call requires an API key provided in one of two ways:

- **`X-API-KEY` HTTP header** (recommended)
- **`api_key` JSON field** in the request body

There are two types of API keys:

1. **User API key**: Obtained from the [account settings page](https://cp.unione.io/en/user/info/api). Grants access to all account-level operations including project management.
2. **Project API key**: Obtained from the [Projects page](https://cp.unione.io/en/user/project) or via the project API methods. Scopes access to a specific project's data only (domains, templates, suppressions, webhooks). Cannot be used for `project/*` methods.

The API base URL depends on the datacenter where the user is registered:

- `https://api.unione.io/en/transactional/api/v1` (auto-routing, preferred)
- `https://eu1.unione.io/en/transactional/api/v1` (European instance)
- `https://us1.unione.io/en/transactional/api/v1` (US instance)

All requests must use HTTPS and are HTTP POST with JSON bodies.

## Features

### Email Sending

Send transactional or marketing emails to up to 500 recipients per request. Supports HTML, plaintext, and AMP email bodies. Emails can include per-recipient substitutions (merge tags), metadata, attachments, and inline attachments. Scheduling is supported up to 24 hours in advance via the `send_at` option. Template engines available: `simple`, `velocity`, `liquid`, or `none`. Link click tracking and read tracking are enabled by default. An idempotence key can be provided to prevent duplicate sends within a one-minute window.

- Unsubscribe links are appended by default; skipping them requires support approval.
- Bypass options exist to override global/account-level unavailability, unsubscribe, and complaint lists (requires `bypass_global=1`).

### Email Subscription Management

Send a re-subscribe email to recipients who previously unsubscribed or were blocked due to complaints. The recipient receives an email with a link to restore their subscription.

- Limited to once per day per recipient by default.

### Email Validation

Validate individual email addresses to check if they are valid, invalid, suspicious, or unknown. Returns a validity score (0–100), cause details (e.g., disposable, spamtrap, mailbox not found, possible typo), and a suggested correction for typos.

- Intended for single real-time checks (e.g., form validation), not bulk validation.

### Template Management

Create, update, retrieve, list, and delete reusable email templates stored on UniOne's side. Templates support all the same properties as direct email sends (body, subject, sender, headers, attachments, substitutions, metadata). When sending, you reference a template by ID, and any fields omitted in the send call are filled from the template.

- Supports `simple`, `velocity`, and `liquid` template engines.
- Up to 10,000 templates per project.

### Suppression List Management

Manage suppression lists to control which email addresses are blocked from receiving emails. You can add, query, list, and delete suppressed addresses. Suppression causes include: `unsubscribed`, `temporary_unavailable`, `permanent_unavailable`, `complained`, and `blocked`. Each suppression record indicates its source (user, system, or subscriber) and whether it is deletable.

- Filtering by cause, source, and date is supported when listing.

### Domain Management

Register, verify, and manage sender domains programmatically. The workflow involves: retrieving required DNS records (verification TXT record, DKIM key, SPF include), adding them to your DNS, then triggering validation. Domain status can be checked to confirm verification and DKIM activation before sending.

- Domains require both a confirmed verification record and an active DKIM record to be used as sender domains.

### Event Dumps

Request historical event data exports for a given time period in CSV or gzipped CSV format. Events can be filtered by job ID, email status, delivery status, recipient email, sender email, domain, or campaign ID. Aggregated daily statistics are also available.

- Data is stored for up to 45 days depending on the tariff.
- Up to 10 dump files can exist at a time; each is kept for 8 hours.

### Tag Management

List and delete user-defined tags used to categorize outgoing emails. Tags are assigned when sending emails (up to 4 per email) and can be used to filter and analyze delivery statistics.

- Up to 10,000 tags per project.

### Project Management

Create, update, list, and delete projects to isolate domains, templates, webhooks, suppression lists, and sending data for different clients or use cases. Each project gets its own API key. Projects support per-project sending limits, country-based data handling (e.g., GDPR), and custom unsubscribe settings.

- Project functionality is disabled by default and must be enabled by support.

### System Information

Retrieve account or project information including user ID, email, accounting period details, and email counters.

## Events

UniOne supports **webhooks** for real-time event notifications. You register a webhook URL and configure which event types to listen for. UniOne will POST JSON payloads (or gzipped JSON) to your URL when events occur. Multiple events can be batched into a single request.

### Email Status Events (`transactional_email_status`)

Notifies when the delivery status of a sent email changes. You can subscribe to specific statuses:

- **delivered** – Email was delivered to the recipient's mail server.
- **opened** – Email was opened/read by the recipient.
- **clicked** – A link in the email was clicked.
- **unsubscribed** – Recipient unsubscribed after reading the email.
- **subscribed** – Recipient re-subscribed after previously unsubscribing.
- **soft_bounced** – Temporary delivery failure; retries will occur for up to 48 hours.
- **hard_bounced** – Permanent delivery failure; no further attempts.
- **spam** – Recipient reported the email as spam (via FBL from supported providers).

Each event includes job ID, recipient email, event timestamp, and any metadata passed at send time. Optionally, detailed delivery info can be included (SMTP response, user agent, IP address, clicked URL).

### Spam Block Events (`transactional_spam_block`)

Notifies when sending is blocked or unblocked by a recipient domain's SMTP server. Includes the domain name, block type (single or multiple SMTP), count of blocked SMTPs, and whether it is a block or unblock event.

**Webhook configuration options:**

- `event_format`: JSON or gzipped JSON.
- `delivery_info`: Whether to include detailed SMTP response and user agent data.
- `single_event`: Whether to send one event per request or batch multiple events.
- `max_parallel`: Maximum number of concurrent webhook calls to your server (5–100).
- Webhook integrity can be verified via an MD5 auth hash included in each payload.
