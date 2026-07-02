Now let me check the actual API documentation to understand the available endpoints and features:Now I have enough information to compile the specification.

# Slates Specification for Sender

## Overview

Sender (Sender.net) is an email and SMS marketing platform that enables users to manage subscribers, create and send email/SMS campaigns, build automation workflows, and design subscription forms and landing pages. It supports both marketing campaigns and transactional email delivery via API and SMTP.

## Authentication

Sender uses API keys for authentication. To authenticate requests, include an Authorization header with the value "Bearer {API_ACCESS_TOKEN}".

To obtain an API access token:

1. Navigate to Settings > API access tokens in your Sender account. Click "Create API token" and pick the validation period "Forever." After that, a unique access token is generated.
2. Copy the token and use it in the `Authorization` header as a Bearer token.

**Base URL:** `https://api.sender.net/v2/`

**Header format:**

```
Authorization: Bearer {API_ACCESS_TOKEN}
Accept: application/json
Content-Type: application/json
```

Sender also supports SMTP relay for sending emails, with server `smtp.sender.net` on ports 25, 2525, or 587 using PLAIN or LOGIN authentication over TLS. SMTP credentials are generated separately from the API token via the Setup instructions page in Sender.

## Features

### Subscriber Management

Manage your contact database through the API. Subscribers can be added or removed from a particular group, resubscribed, marked as unsubscribed, deleted, exported, and saved as a segment. Custom fields can be used for email personalization and segmentation. They attach additional information to subscribers, such as name, surname, location, etc.

### Groups

Groups function as mailing lists. They can be created, edited, and managed. Each new subscriber must be put into a group upon import or assigned to it before sending a campaign. Users can add multiple group tags for the same subscriber.

### Segments

Subscribers can be segmented by various conditions, including subscription status, subscriber details, campaign activity, SMS campaign activity, ecommerce metrics, abandoned cart, and fields. Segments are dynamic filters that automatically update based on criteria like engagement, behavior, or attributes.

### Email Campaigns

The API enables sending personalized email campaigns, managing contacts, analyzing campaign performance, and triggering transactional emails based on user actions. Campaigns can be created, configured, and sent to specific groups or segments.

### Transactional Email

Once your domain is verified, you can start sending transactional emails using either the API or SMTP relay. The API allows you to send transactional emails programmatically. Transactional emails support:

- Personalization via template variables using Liquid syntax.
- Attachments such as PDFs, invoices, or documents up to 10MB.
- Sending with or without pre-built campaign templates.

### SMS Campaigns

Sender supports SMS marketing alongside email. SMS messages can be composed and sent to subscribers, and can be incorporated as steps in automation workflows.

### Marketing Automation

Any needed sequence can be built using different steps, conditions, and triggers. Available triggers include:

- Subscriber is added to a group.
- Subscriber is removed from a group.
- A link is clicked.
- Cart is abandoned.
- A date-based trigger.
- An API call is made – start the automation with any system event by sending an API call from any other system or program.

Each automation sequence is a combination of different steps: condition, delay, email, SMS, action.

### Subscription Forms

Create and manage popup forms and embedded signup forms for lead capture. Forms can be configured with display triggers (exit-intent, timed), scheduling, and reCAPTCHA protection.

### Analytics and Reporting

Track opens, clicks, conversions, and revenue in real-time. Campaign performance data and engagement metrics are available for both email and SMS campaigns.

## Events

Webhooks allow you to receive real-time updates about specific events in your Sender account by sending automated messages (payloads) to a URL you provide. This feature is available with the Standard and Professional plans.

Webhooks are configured by providing a destination URL and selecting a topic. Each webhook includes a **Signing Secret** for verifying payload authenticity. Webhooks can be paused and reactivated at any time.

### Subscriber Events

- **New subscriber added** — Triggered when any new subscriber is added to the account.
- **New subscriber added to a specific group** — Triggered when a subscriber is added to a particular group.
- **Subscriber unsubscribed from a particular group** — Triggered when a subscriber leaves a specific group.
- **Subscriber data updated** — Triggered when subscriber information is modified.
- **Any subscriber unsubscribes** — Triggered when any subscriber opts out entirely.

### Campaign Events

- **New campaign created** — Triggered when a new email campaign is created.
- **New bounces after sending a campaign** — Triggered when bounces occur following a campaign send.

### Group Events

- **New group created** — Triggered when a new subscriber group is created.
