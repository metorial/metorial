# Resend Integration Specification

## Overview

Resend is an email API platform for sending transactional and marketing emails. It allows you to send, receive, and manage emails programmatically through an API. It provides domain, contact property, contact, segment, topic, broadcast, automation, event, template, suppression, log, API key, and webhook APIs.

## Authentication

Resend uses API key-based authentication. To authenticate you need to add an Authorization header with the contents of the header being `Bearer re_xxxxxxxxx` where `re_xxxxxxxxx` is your API Key.

API keys are created from the Resend dashboard under the API Keys section. Each key has a `permission` setting that can be either `full_access` (can create, delete, get, and update any resource) or `sending_access` (can only send emails).

API keys can also be scoped to a specific domain.

API keys are prefixed with `re_` and are shown only once at creation time.

## Features

### Email Sending

Send transactional emails with HTML, plain text, or published Resend templates. Supports specifying recipients (to, cc, bcc), attachments (including inline images), reply-to addresses, custom headers, metadata tags, and topic scoping. Includes idempotency key support to ensure the same email request is processed only once. Emails can be scheduled, updated, or cancelled before delivery. Batch sending allows sending multiple emails in a single API call.

### Email Receiving

List sent and inbound emails on verified domains. Received and sent email attachments can be listed and downloaded as files, and the original message of a received email can be downloaded as an `.eml` file.

### Domain Management

Register and verify custom sending domains with automatic DNS record configuration (DKIM, SPF, DMARC). Domains can be created, verified, updated, listed, and deleted. Open and click tracking, a custom tracking subdomain, TLS, and sending/receiving capabilities can be configured per domain.

### Contacts, Segments, and Topics

Contacts in Resend are global entities linked to a specific email address. Contact properties can store additional information for broadcast personalization. Contacts can be created, updated, listed, and deleted programmatically. Contacts can be added to and removed from segments for broadcast targeting, and assigned to topics for subscription preference management.

Audiences are still exposed as legacy tools for accounts that use the deprecated Resend Audiences API, but new workflows should prefer contacts, segments, and topics.

### Contact Properties

Contact properties define typed custom fields for contacts. Properties can be created, listed, retrieved, updated with fallback values, and deleted.

### Broadcasts

Broadcasts provide tools for managing contacts and sending personalized broadcasts to them. Broadcasts can be drafted, updated, sent immediately, scheduled for future delivery, or canceled while scheduled or queued. Broadcasts also handle unsubscribe flows automatically.

### Templates

Create and manage reusable email templates with typed variables and fallback values. Templates can be created, retrieved, updated, deleted, published, and duplicated through the API.

### Topics

Topics allow you to scope broadcast sending to specific categories. When you send Broadcasts, you can optionally scope sending to a particular Topic, which allows your users to manage their preferences with more control.

### Automations

Automations define graph-based email sequences, including conditional and wait-for-event branches. Automations can be created, updated, retrieved, listed, stopped, deleted, and inspected through automation run records.

### Events

Events define and trigger named automation inputs. Events can be created with a flat payload schema, sent to a contact ID or email address, retrieved, listed, updated, and deleted.

### Suppressions

Resend does not deliver to addresses on the suppression list, which are added automatically after hard bounces or spam complaints, or manually. Addresses can be suppressed manually, and suppressions can be listed (optionally by origin), looked up by ID or email address, and removed.

### API Key Management

Create, list, and delete API keys programmatically. Keys can be scoped to specific permissions and domains.

### Logs

List recent API request logs (endpoint, method, response status, user agent) and retrieve individual log entries with their request and response bodies.

### Webhook Management

Create, retrieve, update, list, and delete webhook endpoints programmatically. You can select which event types each webhook endpoint subscribes to.

## Events

Resend supports webhooks that deliver real-time notifications via HTTP POST with a JSON payload. You register a publicly accessible URL and choose which events you want to receive. Webhook requests can be verified using a signing secret provided by Resend (powered by Svix).

### Email Events

Supported event types include: `email.sent`, `email.scheduled`, `email.delivered`, `email.delivery_delayed`, `email.complained`, `email.bounced`, `email.opened`, `email.clicked`, `email.received`, `email.failed`, `email.suppressed`.

- **email.sent** — Occurs whenever the API request was successful and Resend will attempt to deliver the message to the recipient's mail server.
- **email.delivered** — Resend successfully delivered the email to the recipient's mail server.
- **email.delivery_delayed** — The email couldn't be delivered to the recipient's mail server temporarily.
- **email.complained** — The recipient marked the delivered email as spam.
- **email.bounced** — The recipient's mail server permanently rejected the email.
- **email.opened** — The recipient opened the email. Requires open tracking enabled on the domain.
- **email.clicked** — The recipient clicked a link in the email. Requires click tracking enabled on the domain.
- **email.received** — An inbound email was received.
- **email.failed** — Occurs whenever the email failed to send due to an error, triggered by issues such as invalid recipients, API key problems, domain verification issues, or email quota limits.

### Contact Events

- **contact.created** — Occurs whenever a contact was successfully created. When importing multiple contacts using CSV, these events won't be triggered.
- **contact.updated** — A contact's information was updated.
- **contact.deleted** — A contact was removed.

### Domain Events

- **domain.created** — A new domain was added.
- **domain.updated** — A domain's configuration was changed.
- **domain.deleted** — A domain was removed.
