# Slates Specification for Mailgun

## Overview

Mailgun is an email service provider (owned by Sinch) that offers APIs for sending, receiving, and tracking email. Mailgun allows the ability to send and receive email in both US and EU regions. It supports transactional and marketing email delivery, email validation, inbound email routing/parsing, and deliverability optimization tools.

## Authentication

Authentication to the Mailgun API is done via HTTP Basic Auth, where the username is `api` and the password is your API key.

Example:

```
curl --user 'api:YOUR_API_KEY'
```

**API Key Types:**

- Account API Keys provide access to numerous API endpoints that allow you to view and modify many aspects of your account and domains. Mailgun allows for the creation and use of multiple API Keys on the account.
- Domain Sending Keys are API keys that only allow sending messages via a POST call on `/messages` and `/messages.mime` endpoints for the specific domain in which they are created.

**Role-Based Access Control (RBAC):**

RBAC API Keys empower admin users to generate API keys using predefined roles that dictate the access level of each key. Available roles:

- **Admin**: Full administrative access across all endpoints.
- **Analyst**: Read-only access to data and metrics.
- **Developer**: Full access to technical endpoints needed for building and maintaining email integrations.
- **Support**: Read access to most endpoints with write access to specific management endpoints.

**Region-Specific Base URLs:**

Mailgun supports both US and EU regions. Use the appropriate base URL based on which region your domain was created in.

- US: `https://api.mailgun.net/`
- EU: `https://api.eu.mailgun.net/`

**Webhook Signature Verification:**

Mailgun uses the account's HTTP Webhook Signing Key to sign all HTTP payloads sent to webhook endpoints. Each webhook payload is signed using HMAC-SHA256 with a timestamp and token to verify authenticity.

## Features

### Email Sending

Send transactional and marketing emails programmatically via REST API or SMTP relay. With a single API call, you can send up to 1,000 fully personalized emails. Mailgun will properly assemble the MIME message and send the email to each user individually. Supports attachments, inline images, custom headers, scheduled delivery, and tagging.

### Domain Management

The Domains API manages domains, domain keys, and DNS verification. Configure sending domains, verify DNS records (SPF, DKIM, DMARC), manage domain-specific tracking settings, and manage DKIM security keys. Each domain within Mailgun is an isolated sub-account with its own sending queue and reputation.

### Email Tracking

Mailgun offers tracking for clicks, unsubscribes, and opens, with optional HTTPS protocol support on tracking URLs. Tracking can be enabled per message using parameters like `o:tracking`, `o:tracking-opens`, and `o:tracking-clicks`.

### Inbound Email Routing and Parsing

Define a list of routes to handle incoming emails. When a message matches a route expression, Mailgun can forward it to your application via HTTP or another email address, or store the message temporarily (3 days) for subsequent retrieval. Route expressions can match by recipient address, headers, or custom regex patterns. Mailgun's Inbound Processing delivers inbound messages already parsed and structured as JSON.

### Suppressions Management

Mailgun automatically classifies and records bounce events (hard and soft), spam complaints, and unsubscribes into a Suppressions list. Once an address is added to your suppressions, Mailgun prevents further delivery attempts to protect your sending reputation. An allowlist API lets you prevent specific addresses from being added to the bounce list.

### Mailing Lists

The API allows for management of mailing lists, including subscriber addition, removal, and segmentation. Mailing lists can be used as recipients when sending messages.

### Templates

Manage reusable email templates with variable substitution. Templates can be stored and versioned within Mailgun and referenced when sending messages.

### Analytics and Reporting

The Metrics API provides programmatic access to detailed analytics data about your email sending activity, allowing you to query, filter, and analyze email performance metrics. Mailgun keeps track of every inbound and outbound message event and stores this log data. Using the Logs API, this data can be queried and filtered. You can tag messages for aggregate reporting.

### Email Validation

Mailgun provides a real-time Email Validation API to quickly remove invalid and high-risk addresses. Supports both single-address validation and bulk list validation.

### Deliverability Optimization (Mailgun Optimize)

- IP blocklist monitoring allows you to take immediate action if your IP is listed.
- Mailgun Optimize identifies and helps you avoid spam traps within your email lists.
- Integration with Google Postmaster Tools allows you to gain insights into how your emails are performing within the Gmail ecosystem.
- The Email Health Score API provides health scores for the overall account, as well as by domain, IP, and subaccount.
- Bounce classification identifies critical bounces and classifies them by sending domain and mailbox provider/spam filter.

### Send Alerts

Mailgun allows you to get instant notifications on the sending metrics that matter most, configured specifically for your unique business needs. Route these alerts to the channels your team relies on.

### IP Management

Manage dedicated IPs, IP pools, and dynamic IP pools. Supports automated IP address warmup for new dedicated IPs.

### Subaccounts

Mailgun allows you to set limits on your subaccounts to help you manage usage and costs. You can create, update, retrieve, and delete limits for various pre-send features such as email previews and email validations.

## Events

Mailgun supports webhooks that push real-time email event data to your endpoints via HTTP POST.

Webhooks can either be configured at the domain level or at the account level, enabling you to set unique endpoints for each domain or fire an event for any of your domains/subaccounts. Each event type is configured individually and can contain up to 3 URLs per event type. Regions are isolated, meaning you will need to create distinct webhooks in each region for the account/domains.

### Delivered

Mailgun sent the email and it was accepted by the recipient email server.

### Opened

The email recipient opened the email and enabled image viewing. Tracking must be turned on.

### Clicked

The email recipient clicked on a link in the email. Click tracking must be turned on and the CNAME record must be pointing to mailgun.org.

### Unsubscribed

The email recipient clicked on the unsubscribe link. Unsubscribe tracking must be turned on.

### Complained

The email recipient clicked on the spam complaint button and the recipient's email server provides feedback loops to Mailgun for these complaints.

### Bounced / Failed

Permanent delivery failures (hard bounces) and temporary delivery failures. Includes detailed failure reason and error codes.

### Accepted

Mailgun accepted the API or SMTP request to send, and the message was put in your queue.

### Rejected

Mailgun rejected the API request to send/forward the email.

### Stored

The inbound email was successfully stored. Relevant for inbound routing with the store action.
