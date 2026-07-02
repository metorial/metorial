# Slates Specification for Smtp2go

## Overview

SMTP2GO is a scalable email and SMS service provider that simplifies delivery for everyday senders and businesses, ensuring their messages arrive reliably and securely. The SMTP2GO API allows you to programmatically send emails or SMS messages, access reporting and statistics, and manage account features using HTTP requests.

## Authentication

Every request that you make to the SMTP2GO API must be authenticated by using an API Key from your account. You can add and manage API Keys in your SMTP2GO account by navigating to the "Sending > API Keys" section from the left-side menu.

The API key is passed via the `X-Smtp2go-Api-Key` HTTP header on every request. Alternatively, it can be included as the `api_key` field in the JSON request body.

You can specify permissions for your API Key to determine whether the key can access a particular endpoint.

The SMTP2GO API's base URL is: `https://api.smtp2go.com/v3/`. Regional endpoints are also available for US, EU, and AU.

Certain API calls can be performed on subaccounts, using a parent/master account's API Key. The relevant subaccount is specified by including the `subaccount_id` parameter in the API call.

## Features

### Email Sending

There are two ways to send emails through the API: Standard Email and MIME Email. With the Standard Email endpoint, you pass all of the components of an email, such as the sender, subject, body and recipient as a JSON object. The MIME option allows sending a pre-composed MIME string directly. Emails support HTML and plain text bodies, attachments, CC/BCC recipients, custom headers, and inline images. You can also reference a saved template when sending.

### SMS Messaging

Customers on paid-level plans can send SMS messages to single or multiple recipients, up to a maximum of 100 destination addresses at a time. You can also view received SMS messages if a recipient responds. Sending SMS messages does incur additional charges.

### Email Templates

Manage email templates within your account to be integrated and personalized when sending via the API. Templates can be created, edited, deleted, searched, and viewed. Templates support personalization variables that are populated at send time.

### Statistics and Reporting

Retrieve account statistics to monitor deliverability, bounce rate, spam complaints, unsubscribes, monthly usage, and email history. Reports can be filtered by date range and other parameters.

### Account Activity

Search email events such as bounces, opens and unsubscribes in your account. You can search by sender, recipient and a range of other parameters.

### Sender Domain Management

Manage sender domains used for sending emails. You can add, remove, view, and verify domains to enable SPF and DKIM authentication. Tracking domains and return path domains can also be configured.

### Single Sender Emails

Authorize individual email addresses as verified senders when you cannot verify an entire domain. These can be added, viewed, and removed.

### Allowed Senders (Restrictions)

Restrict sending via your account based on the sender email address or domain. After enabling Restrict Senders, you create a list of addresses and/or domains. You can set it so the list consists of 'allowed' senders or 'not allowed' senders.

### Suppressions

Manage the list of email addresses and domains that are automatically suppressed from receiving emails due to hard bounces, spam complaints, or unsubscribes. You can also manually add or remove suppressions.

### SMTP Users

Manage SMTP user credentials used for authentication when sending via SMTP relay. Each SMTP user can have individual settings for open tracking, click tracking, unsubscribe footer, rate limits, and email archiving.

### Email Archiving

Store sent emails including content, attachments, and delivery records for 1–5 years. Archived emails can be searched and viewed. Available on paid plans only, with additional charges.

### Subaccounts

Create separate subaccounts under your main account to manage clients, departments, or projects needing isolated settings and reports. Subaccounts can be added, edited, closed, reopened, and re-invited. Available on paid plans only.

### IP Allowlist

Restrict API and SMTP sending to specific IP addresses for enhanced security. You can add, edit, view, and remove allowed IPs.

### Webhook Management

Create, view, edit, and remove webhooks via the API. Webhooks can be scoped to specific SMTP users or API keys, and configured for specific event types.

## Events

Webhooks are an advanced feature that allows SMTP2GO to notify your own web service whenever an event happens in your SMTP2GO account (for emails or SMS messages). The webhook output can be JSON or Form encoded.

Webhooks can be set for selected SMTP Users, API Keys or Authenticated IPs. Custom email headers can optionally be included in the event data.

### Email Events

Supported email events include: "processed", "delivered", "open", "click", "bounce", "spam", "unsubscribe", "resubscribe", or "reject".

- **Processed** – Email has been accepted for processing.
- **Delivered** – Email was successfully delivered to the recipient's mail server.
- **Open** – Recipient opened the email (requires open tracking). Includes device and user-agent information.
- **Click** – Recipient clicked a link in the email (requires click tracking). Includes the clicked URL and device info.
- **Bounce** – Email bounced. Includes classification as either hard or soft bounce.
- **Spam** – Recipient reported the email as spam.
- **Unsubscribe** – Recipient unsubscribed from emails.
- **Resubscribe** – A previously unsubscribed recipient resubscribed.
- **Reject** – Email was rejected before delivery.

### SMS Events

SMS events can also be selected for webhook triggers. SMS webhook data includes destination, delivery status, the sending number, and submission timestamp.
