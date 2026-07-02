# Slates Specification for Postmark

## Overview

Postmark is a transactional and broadcast email delivery service that provides APIs for sending, receiving, and tracking emails. Postmark helps deliver and track application email, replacing SMTP with a more reliable and scalable environment. It allows tracking statistics such as number of emails sent or processed, opens, bounces, and spam complaints.

## Authentication

Postmark uses API token-based authentication via HTTP headers. There are three different kinds of tokens for authentication with the API and SMTP.

### Server API Token

Postmark has a **Server Token** used via the `X-Postmark-Server-Token` header for requests that require server-level privileges. This includes sending emails, managing templates, retrieving bounces, viewing messages, and managing webhooks. Each Postmark server has its own API token, allowing you to isolate access and data for each application that connects to Postmark. A server can have up to 3 API tokens associated with it.

To use it, include the header in your request:

```
X-Postmark-Server-Token: your-server-token
```

To find your Server API token in Postmark, visit the API Tokens tab within your Servers.

### Account API Token

The Account API Token is required for API actions that only the Account Owner and Account Admin have access to, including creating new Servers and adding new Sender Signatures or Domains.

Used via the `X-Postmark-Account-Token` header:

```
X-Postmark-Account-Token: your-account-token
```

The Account API Token can be found on the API Tokens page in the Account section.

### Test Mode

When you want to send test emails that don't get delivered to the recipient, you can pass the `POSTMARK_API_TEST` value in the `X-Postmark-Server-Token` header field.

## Features

### Email Sending

Send transactional and broadcast emails via the API. You can provide HtmlBody for HTML formatted messages, TextBody for plain text, or include both for multipart. Emails support To, Cc, Bcc, ReplyTo, custom headers, attachments, tags, and custom metadata. You must have a registered and confirmed sender signature with the sender email. Batch sending is supported for sending multiple messages in a single call.

### Email Templates

Create, edit, delete, and list reusable email templates with dynamic variables. Templates allow you to repeatedly use an HTML/CSS layout while only having to pass up the dynamic data (user name, company name, etc.) for the email in your API call. Templates can be sent individually or in batches. You can duplicate a single template to another Postmark server in your account or keep all templates in sync between servers using the templates push feature. Templates support validation before sending.

### Message Streams

Postmark separates emails by Message Streams. Transactional Message Streams are for one-to-one emails triggered by a user action like a welcome email, password reset, or order confirmation. Newsletters, announcements, or any other bulk email can be sent through Broadcast Message Streams. You can create, edit, list, archive, and unarchive message streams.

### Bounce Management

Retrieve delivery statistics, search and list bounces, get details for individual bounces, and reactivate bounced addresses. Your webhook would receive data for Hard Bounces, Soft Bounces, Undeliverable bounces, etc. Bounces include classification type, recipient, description, and details.

### Suppressions Management

Manage, view, create, and delete suppressions in your Message Stream. If an address is suppressed it means it's not currently active for sending to. Suppressions can originate from hard bounces, spam complaints, manual suppression, or recipient unsubscribes. SpamComplaint suppressions cannot be deleted.

### Inbound Email Processing

Receive and parse inbound emails sent to your Postmark inbound address. You can configure inbound rules to filter or route messages, set up inbound domain forwarding, and configure spam thresholds for inbound blocking.

### Message Search and Retrieval

Get the details of any message that you sent or received through a specific server. Search outbound and inbound messages, retrieve message details and raw dumps. When searching for messages with the Messages API, you can filter based on metadata values.

### Open and Click Tracking

Access features like event tracking (delivery, opens, link clicks, client usage) and high-level aggregate data to understand whether your messages are having the desired effect. Track opens per server or per individual email. Track link clicks across messages with details about which links were clicked and by whom.

### Statistics

Retrieve aggregate sending statistics including sent counts, bounces, spam complaints, tracked email opens, and link click data. Stats can be filtered by date range and tag.

### Server and Account Management

Get and edit server details and settings. At the account level (using the Account API Token), manage multiple servers — create, list, edit, and delete them.

### Domain and Sender Signature Management

Manage sending domains, including adding domains, verifying SPF and DKIM DNS records, and rotating DKIM keys. Manage sender signatures (individual email addresses authorized to send) with verification.

### Webhook Management

Programmatically create, list, edit, and delete webhooks for specific message streams. Add up to 10 webhooks with any combination of events. Webhooks support HTTP Basic Auth and custom headers for security.

### Data Removal

Request removal of recipient data from Postmark's system for compliance purposes.

## Events

Postmark's webhooks notify your application about key message events such as bounces, deliveries, opens, clicks, and spam complaints. Webhooks in Postmark exist in two primary contexts: Outbound Message Stream Webhooks for events related to emails you send, and Inbound Message Stream Webhooks for notifications when Postmark receives and parses emails sent to your inbound addresses.

Webhooks are configured per message stream and can be managed via the API or UI.

### Bounce

Triggered when an outbound email bounces (hard bounce, soft bounce, undeliverable, etc.). Spam complaints, unsubscribes/subscribes, or manual deactivations have their own webhooks and are not triggered via the Bounce webhook. Optionally includes the message content.

### Delivery

Notifies your application that an email was successfully delivered to the receiving server. Includes the recipient, delivery timestamp, tag, and custom metadata.

### Open Tracking

Triggered when a recipient opens an email. Can be configured to post only on the first open (`PostFirstOpenOnly`) or on every open event. Includes information about the recipient, client, OS, and platform.

### Click Tracking

Postmark will POST one event per unique click to your webhook — one per unique recipient and link combination. Includes the original and clicked URL, recipient, and client info.

### Spam Complaint

Triggered when a recipient marks your email as spam. Optionally includes the message content.

### Subscription Change

Notifies your app when a recipient is added to or removed from the Suppressions list. Includes the suppression reason (hard bounce, spam complaint, manual suppression) and whether sending is suppressed or re-enabled.

### Inbound Email

Triggered when Postmark receives an inbound email at your configured inbound address. The webhook delivers the parsed email content (from, to, subject, body, attachments, headers) as JSON to your endpoint.

### SMTP API Error

Triggered when an SMTP-sent message encounters an API-level error (e.g., inactive recipient, invalid address). Can be enabled per server.
