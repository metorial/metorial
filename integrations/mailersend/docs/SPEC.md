Let me get the specific webhook events list and the token scopes/permissions details.Now let me get the SMS webhook events and the token scopes.Now I have all the information needed. Let me compile the specification.

# Slates Specification for MailerSend

## Overview

MailerSend is a transactional messaging service that provides APIs for sending emails and SMS messages. It offers email sending, email verification, SMS messaging, inbound routing, analytics, template management, and domain management through a REST API.

## Authentication

MailerSend uses **API token (Bearer token)** authentication.

Authentication is done by adding an `Authorization` header containing a Bearer token: `Authorization: Bearer {API_TOKEN}`.

API tokens are generated for sending domains and can have different permissions to limit which areas of your account they may be used to access.

To obtain an API token:

1. Navigate to the Integrations page in the MailerSend dashboard.
2. Click "Manage" next to MailerSend API.
3. Click "Create new token", name it, select the domain, and choose permissions.
4. For security reasons, the API token is only shown once, so copy or download it and save it somewhere safe.

**Permission Scopes:**

You can choose between Full access and Custom access permissions. Full access allows the API token to access GET, PUT, DELETE and POST endpoints for all parts of your account. Custom access allows you to choose which access to provide for the token.

Available custom scopes:

- `email_full` — Full email sending access
- `domains_read`, `domains_full` — Read or full access to domain management
- `activity_read`, `activity_full` — Read or full access to activity data
- `analytics_read`, `analytics_full` — Read or full access to analytics
- `tokens_full` — Manage API tokens
- `webhooks_full` — Manage webhooks
- `templates_full` — Manage email templates
- `suppressions_read`, `suppressions_full` — Read or full access to suppression lists
- `sms_read`, `sms_full` — Read or full SMS access
- `email_verification_read`, `email_verification_full` — Email verification access
- `inbounds_full` — Manage inbound routing
- `recipients_read`, `recipients_full` — Read or full access to recipients
- `sender_identity_read`, `sender_identity_full` — Manage sender identities
- `users_read`, `users_full` — Manage account users
- `smtp_users_read`, `smtp_users_full` — Manage SMTP users

## Features

### Email Sending

Send transactional emails via the API with support for HTML and plain text content, attachments, custom headers, CC/BCC recipients, reply-to addresses, and tags. MailerSend also supports PGP-encrypted emails. Bulk email sending is available for sending multiple messages in a single request. Emails can be scheduled for future delivery.

### SMS Messaging

MailerSend's transactional SMS service is currently available in the US and Canada. Send transactional SMS messages such as OTPs, appointment reminders, order confirmations, and delivery updates. Manage phone numbers and SMS recipients, and view SMS activity.

### Email Templates

Create and manage reusable email templates. The Personalization feature allows you to personalize email messages by generating dynamic content for each recipient. Uses a Twig-based templating engine for variables, conditionals, and loops. Email survey templates are also supported for collecting feedback.

### Domain Management

Add and manage sending domains, including DNS configuration for SPF, DKIM, and DMARC authentication records. Use multiple domains to manage different brands or products with one MailerSend account.

### Sender Identities

Create and manage verified sender identities (name and email address) used as the "From" address when sending emails.

### Inbound Routing (Email and SMS)

Automatically parse incoming emails. Inbound email routes enable MailerSend to receive emails on your behalf, integrating them into your application. With MailerSend's inbound routing feature, you can create inbound routes to have MailerSend receive incoming messages on your behalf and integrate them into your app. SMS inbound routing is also available.

### Email Verification

Verify a single email address or upload an entire email list to verify in bulk. Helps clean recipient lists and validate emails at the point of collection to reduce bounces.

### Activity and Analytics

View email and SMS activity in real-time. Access analytics data on email delivery, opens, clicks, bounces, and other engagement metrics. Create custom analytics reports.

### Recipients and Suppression Management

Manage recipient data and suppression lists (hard bounces, spam complaints, unsubscribes). Suppressions automatically prevent sending to problematic addresses.

### User Management

Invite team members and manage user permissions and access levels for your MailerSend account.

### API Token and SMTP User Management

Programmatically create, list, update, pause/unpause, and delete API tokens and SMTP user credentials.

### DMARC Monitoring

Monitor DMARC reports for your sending domains.

## Events

MailerSend supports webhooks for both email and SMS events. Webhooks are configured per domain (for email) or per phone number (for SMS) and deliver JSON payloads to a specified endpoint URL. Each webhook includes a `Signature` header for verification using HMAC-SHA256 with a signing secret.

### Email Activity Events

Real-time notifications for email lifecycle events:

- **Sent** (`activity.sent`) — Email sent from MailerSend's servers.
- **Delivered** (`activity.delivered`) — Email successfully delivered.
- **Soft Bounced** (`activity.soft_bounced`) — Email soft bounced.
- **Hard Bounced** (`activity.hard_bounced`) — Email hard bounced (not delivered).
- **Deferred** (`activity.deferred`) — Email temporarily delayed. Only available on paid plans.
- **Opened** (`activity.opened`) — Recipient opened the email.
- **Opened Unique** (`activity.opened_unique`) — First-time open only.
- **Clicked** (`activity.clicked`) — Recipient clicked a link.
- **Clicked Unique** (`activity.clicked_unique`) — First-time click only.
- **Unsubscribed** (`activity.unsubscribed`) — Recipient unsubscribed.
- **Spam Complaint** (`activity.spam_complaint`) — Recipient marked the email as spam.
- **Survey Opened** (`activity.survey_opened`) — Recipient opened an email containing a survey for the first time.
- **Survey Submitted** (`activity.survey_submitted`) — Recipient completed a survey or after 30 minutes of idle time.

### Email Operational Events

- **Sender Identity Verified** (`sender_identity.verified`) — A sender identity has been verified.
- **Inbound Forward Failed** (`inbound_forward.failed`) — An inbound email message failed to forward.
- **Bulk Email Completed** (`bulk_email.completed`) — A bulk email batch has completed processing.
- **Single Email Verified** (`email_single.verified`) — A single email address verification completed.
- **Email List Verified** (`email_list.verified`) — A bulk email verification list completed processing.

### Maintenance Events

- **Maintenance Start** (`maintenance.start`) — A scheduled maintenance period has begun.
- **Maintenance End** (`maintenance.end`) — A maintenance period has ended.

### SMS Events

Separate webhook configuration for SMS events, scoped per phone number:

- **SMS Sent** (`sms.sent`) — SMS sent from MailerSend's servers.
- **SMS Delivered** (`sms.delivered`) — SMS successfully delivered.
- **SMS Failed** (`sms.failed`) — SMS failed to deliver.
