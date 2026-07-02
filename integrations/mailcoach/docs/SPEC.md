Now let me check the webhooks page for more detail on event types:# Slates Specification for Mailcoach

## Overview

Mailcoach is an email marketing platform built by Spatie that allows sending email campaigns, managing subscriber lists, setting up email automations, and sending transactional emails. It talks to an external outgoing mail provider to send out email campaigns reliably while keeping costs low. Both self-hosted (v6 and up) and hosted Mailcoach (aka Mailcoach Cloud) are supported.

## Authentication

Authentication to the Mailcoach API is done by using a Bearer token. You can create a new token in your account.

The token is passed via the `Authorization` header as `Bearer <token>`. All requests must also include `Accept: application/json` and `Content-Type: application/json` headers.

All endpoints start with `https://[[your-domain]].mailcoach.app/api`. This means authentication requires two pieces of information:

- **API Token**: Generated from the API Tokens screen in Mailcoach settings.
- **Domain**: Your Mailcoach subdomain (the `your-domain` portion of `your-domain.mailcoach.app`).

Example request:

```
curl https://<your-domain>.mailcoach.app/api/user \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json'
```

There are no OAuth flows or scopes — it is a simple API token-based authentication scheme.

## Features

### Email List Management

Create, update, delete, and retrieve email lists (mailing lists). Each list requires a name and a default from email address. Lists can be configured with custom confirmation emails and various subscription settings.

### Subscriber Management

Manage subscribers within email lists — list, add, update, delete, confirm, unsubscribe, and resend confirmation for subscribers. Subscribers can be filtered by email, name, tags, and subscription status (unconfirmed, subscribed, unsubscribed). Tags can be added to or removed from individual subscribers. Subscribers support custom extra attributes/fields.

### Subscriber Imports

Bulk import subscribers into email lists. This allows uploading subscriber data rather than adding them one by one via the API.

### Campaign Management

Create, update, delete, schedule, send, and retrieve campaigns. Campaigns can be built with raw HTML or Markdown (when using a template). Campaigns can be filtered by status: draft, scheduled, or sent. You can send test emails for a campaign before sending it to the full list. After sending, you can retrieve campaign analytics including opens, clicks, unsubscribes, and bounces.

### Templates

Manage reusable email templates that can be used when creating campaigns. Templates allow you to define a base HTML structure with placeholder fields that get filled in when creating a campaign.

### Transactional Emails

Send transactional emails via the API. You can reference a pre-built transactional email template by name, or provide custom HTML. Transactional emails support parameters like subject, from, to, cc, bcc, replacements (for placeholder values), and can optionally be stored in the log or faked for testing.

### Tags and Segments

Create, update, and delete tags on email lists. Tags can be marked as visible or hidden in subscriber preferences. Segments can be created based on combinations of positive and negative tags, allowing targeted sending to subsets of a list.

### Sends

View and manage individual sent items. Sends can be filtered by subscriber, campaign, automation mail, or transactional mail log item.

### Suppressions

Manage suppressed email addresses to prevent sending to specific addresses.

### Links

Retrieve tracked links from campaigns to view click statistics.

## Events

Mailcoach can send a request to your app whenever something happens within Mailcoach. Webhooks are configured in the Mailcoach settings UI, where you specify an endpoint URL and an optional secret for signature verification. You can configure webhooks to be triggered for all mailing lists or only for specific lists. You can also select which specific event types a webhook should receive.

Webhook payloads are signed using HMAC SHA-256 with the configured secret, sent in the `Signature` header.

Mailcoach supports the following webhook event types:

### Subscriber Events

- **Unconfirmed Subscriber Created**: If your list uses confirmation, and a new person is added to the list, this event will be sent.
- **Subscribed**: Triggered when a subscriber completes their subscription (or is added directly without confirmation).
- **Unsubscribed**: Triggered when a subscriber unsubscribes from a list.

### Campaign Events

- **Campaign Sent**: Triggered when a campaign has been fully sent.

### Tag Events

- **Tag Added**: Triggered when a tag is added to a subscriber.
- **Tag Removed**: Triggered when a tag is removed from a subscriber.

### Engagement Events

- **Email Opened**: Triggered when a subscriber opens an email.
- **Link Clicked**: Triggered when a subscriber clicks a link in an email.

### Bounce Events

- **Email Bounced / Soft Bounced**: Triggered when an email bounces or soft bounces.
