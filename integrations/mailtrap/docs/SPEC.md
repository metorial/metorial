# Slates Specification for Mailtrap

## Overview

Mailtrap is an email platform that provides email sending (transactional and bulk), email sandbox testing, email marketing campaigns, and contact management. Its APIs provide comprehensive access to email sending, testing, contact management, and account administration features. Email Sending and Email Sandbox use different base URLs.

## Authentication

Mailtrap uses API token-based authentication. There are several ways to send authenticated HTTP requests: Send a HTTP header `Api-Token: {api_token}`, or send a HTTP header `Authorization: Bearer {api_token}`.

- **API Token**: Generated in the Mailtrap dashboard under **Settings → API Tokens**. API tokens do not have an expiration date; you may reset them manually.
- **Token Permissions**: Permissions are assigned per domain by checking access level boxes. You must have admin permissions on a particular domain to send emails with a token.
- When you create a domain, a token is automatically created and named based on the formula: [domain name] + [token] + [token ID].
- All requests must be sent over HTTPS protocol.

Example header:

```
Authorization: Bearer your_api_token_here
```

or:

```
Api-Token: your_api_token_here
```

## Features

### Transactional Email Sending

Send one-to-one emails triggered by user actions (e.g., password resets, welcome emails, order confirmations). Mailtrap Email Sending API supports email templates, attachments, custom variables, and email categories. Emails can include text, HTML, or reference pre-built templates. Requires a verified sending domain.

### Bulk Email Sending

Bulk Stream is Mailtrap's dedicated infrastructure for sending marketing, promotional, and non-transactional emails, designed to handle high-volume campaigns while maintaining optimal deliverability. This separation protects your transactional email reputation and ensures compliance with email provider requirements. Mailtrap automatically adds unsubscribe headers and can manage suppressions.

### Email Sandbox (Testing)

Allows users to simulate the delivery of emails in a testing environment without actually sending emails to real addresses, useful for testing email templates and ensuring that emails look correct. Sandbox features include: creating sandboxes, resetting credentials, receiving messages, cleaning messages, marking messages as read, and managing users. You can inspect the email body by getting raw HTML, text, and detailed info about the HTML part, including a list of possible errors, and receive message attachments.

### Email Templates

Email templates allow you to design, edit, and host HTML/text templates on Mailtrap and reference them via API. Templates can be used for email sending, email sandbox, and campaigns.

### Contact Management

Mailtrap Contacts allows you to upload and store your contacts on the platform and organize them in different email lists to send targeted campaigns. Features include:

- Import contacts via CSV, API, or third-party integrations. Organize contacts into targeted lists and segments.
- Define custom variables like name, date of birth, or location to personalize campaigns.
- Build dynamic segments that automatically update based on contact properties.

### Sending Domain Management

Manage the domains used for sending emails. To send emails, you must own a domain and add it to Mailtrap. Every new domain requires a Compliance Check after DNS verification.

### Suppression Management

When hard bounce, unsubscribe, and spam complaints events occur, Mailtrap adds the email address to a suppression list. The suppression list contains all the addresses you cannot send emails to. You can view, import (via CSV), manually add, or reactivate suppressed addresses through the API. Suppressions are separated by stream, so unsubscribing from bulk email won't affect transactional email.

### Delivery Statistics and Email Logs

Access delivery analytics and statistics for your sent emails, including open rates, click rates, bounces, and spam complaints. Email logs track individual email deliveries and include information about which API key was used.

### Account and Access Management

Endpoints for programmatic management of account details and access permissions. Manage accounts, users, organizations, API tokens, permissions, and billing through the API.

## Events

Mailtrap supports webhooks for real-time event notifications. Webhooks can be configured for two areas: Audit Log or Email Sending.

### Email Sending Events

You choose the Sending Stream (Transactional or Bulk) for which you want to set up the webhooks. Available event types include: delivery, open, click, unsubscribe, spam, soft bounce, bounce, suspension, and reject. Each event includes metadata such as timestamp, sending stream, message ID, recipient email, and sending domain. Custom variables and email categories are also included when set.

- You can configure the payload format as either JSON or JSON Lines.
- Mailtrap signs all webhook requests to ensure they originate from Mailtrap and haven't been tampered with, using HMAC-SHA256. Each webhook has a unique signing secret to verify authenticity.
- Webhooks can optionally be secured with basic authentication (username/password).

### Audit Log Events

If you choose Audit Log, you will receive events related to all activities within your account that are supported by the Activity Log. Resource types include: user, api_token, billing, account, sso_config, sending_domain, project, inbox, contact_list, contact_field, and contact_segment. Events include actor information (who performed the action) and change details.
