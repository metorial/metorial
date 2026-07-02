Now let me get the full list of webhook events from the Loops webhooks page:# Slates Specification for Loops.so

## Overview

Loops is an email platform designed for SaaS companies that enables sending marketing, product, and transactional emails. It provides contact management, event tracking, mailing list management, and automated email workflows (called "loops") through both a web interface and API.

## Authentication

Loops uses **API key** authentication via Bearer token.

- Generate an API key from **Settings → API** in your Loops dashboard.
- Include the key in the `Authorization` header of every request: `Authorization: Bearer <your_api_key>`.
- The base URL for all API requests is `https://app.loops.so/api/v1/`.
- API keys are scoped to a team. You can verify a key by making a `GET` request to `/api-key`, which returns the team name if valid.
- There are no OAuth flows or additional scopes; a single API key grants access to all available API functionality for the team.

## Features

### Contact Management

Create, find, update, and delete contacts in your audience. Contacts are identified by email address and/or a unique user ID. Each contact has default properties (email, first name, last name, source, user group, subscribed status) and can have any number of custom properties. Contacts can be subscribed or unsubscribed from your audience. When double opt-in is enabled, contacts created via forms must confirm before becoming active.

### Contact Properties

Retrieve the list of all contact properties (both default and custom) defined on your account. Properties have a key, label, and type. Custom properties can be included when creating or updating contacts.

### Mailing Lists

Retrieve all mailing lists configured in your account. Each list has a name, optional description, and a public/private flag. Contacts can be subscribed to or unsubscribed from mailing lists when creating/updating contacts or sending events.

### Events

Send named events associated with a contact (identified by email or user ID) to trigger automated email workflows ("loops"). Events can include custom event properties and mailing list subscriptions. If the contact does not exist, a new one will be created automatically.

### Transactional Email

Send transactional emails using pre-built templates created in the Loops editor. Each transactional email is referenced by its unique ID. Data variables can be passed to populate dynamic content in the template. Supports file attachments (when enabled on the account) and dynamic email headers (subject, from, reply-to, CC, BCC). Supports idempotency keys to prevent duplicate sends. You can also list all published transactional email templates to discover available template IDs and their required data variables.

## Events

Loops supports outgoing webhooks that send HTTP POST requests to a configured endpoint when certain events occur. You configure a single webhook endpoint per account in **Settings → Webhooks**, where you receive a signing secret for request verification. You can selectively subscribe to specific event types.

### Contact Events

Notifications about changes to contacts in your audience:

- **contact.created** — A new contact has been created. Includes full contact data. When double opt-in is enabled, this fires only after confirmation.
- **contact.unsubscribed** — A contact has been unsubscribed from your audience.
- **contact.deleted** — A contact has been deleted from your audience.
- **contact.mailingList.subscribed** — A contact has been subscribed to a mailing list. Includes mailing list details.
- **contact.mailingList.unsubscribed** — A contact has been unsubscribed from a mailing list. Includes mailing list details.

### Email Sending Events

Notifications about emails being dispatched to recipients:

- **campaign.email.sent** — A campaign email was sent to a contact. Fires per recipient. Includes campaign ID and related mailing lists if applicable.
- **loop.email.sent** — A loop (automated workflow) email was sent to a contact. Fires per recipient.
- **transactional.email.sent** — A transactional email was sent.

### Email Engagement Events

Notifications about recipient interactions with sent emails. Each event includes the source type (campaign, loop, or transactional) and the related email identifiers:

- **email.delivered** — Email successfully delivered to recipient.
- **email.softBounced** — Email temporarily failed delivery (may be retried).
- **email.hardBounced** — Email permanently failed delivery. Results in the contact being unsubscribed.
- **email.opened** — Email was opened. Available for campaigns and loops only.
- **email.clicked** — A link in the email was clicked. Available for campaigns and loops only.
- **email.unsubscribed** — Recipient unsubscribed via the email's unsubscribe link. Available for campaigns and loops only.
- **email.resubscribed** — Recipient resubscribed via the email's preference center. Available for campaigns and loops only.
- **email.spamReported** — Recipient reported the email as spam.
