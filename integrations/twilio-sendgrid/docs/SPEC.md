# Slates Specification for Twilio SendGrid

## Overview

Twilio SendGrid is a cloud-based email delivery platform that provides APIs for sending transactional and marketing emails at scale. The API endpoints allow you to send transactional emails, create marketing campaigns, manage your contacts, and monitor the health of your email statistics. It also supports inbound email parsing, email address validation, and suppression management.

## Authentication

SendGrid supports API keys delivered via Bearer token or Basic authentication, depending on the SendGrid functionality you are using.

**API Key (Bearer Token) — Primary method:**

To use an API key, pass an Authorization header with a value of `Bearer <Your-API-Key-Here>`, where you replace `<Your-API-Key-Here>` with the API Key that you created in the UI.

- Base URL: `https://api.sendgrid.com/v3/` (global) or `https://api.eu.sendgrid.com` (EU region)
- Authenticate to the SendGrid API by creating an API Key in the Settings section of the SendGrid UI.
- You will only be shown your API key one time. Please store it somewhere safe as we will not be able to retrieve or restore it.

**API Key access levels:**

Full Access allows the API key to access GET, PATCH, PUT, DELETE and POST endpoints for all parts of your account, excluding billing and Email Address Validation. Custom Access customizes levels of access for all parts of your account, excluding billing and Email Address Validation. Billing Access allows the API key to access billing endpoints for the account.

Billing permissions are mutually exclusive from all other permissions. An API Key can have either Billing Permissions or any other set of Permissions but not both.

Email Address Validation is available to Email API Pro and Premier level accounts only. An Email Validation API key is required.

**Basic Authentication (limited use):**

SendGrid supports Basic Authentication using an API key as your password value for some services. When using Basic Authentication, your username will always be "apikey," and your password will be your API key. This is primarily used for SMTP integration.

Two-Factor Authentication is required as of Q4 2020, and all Twilio SendGrid API endpoints will reject new API requests and SMTP configurations made with a username and password via Basic Authentication.

## Features

### Email Sending

Send transactional and marketing emails via the Mail Send API. The endpoint accepts a JSON object that specifies the details of the email(s) to be sent. This includes not only the basic elements like the sender, recipient, subject, and content, but also more advanced features like personalizations, attachments, and dynamic templates.

- Support for personalizations to customize content per recipient (to, cc, bcc, subject overrides, dynamic template data).
- Attachments, custom headers, categories, and custom arguments.
- Including a batch_id in your request allows you to include this email in that batch. It also enables you to cancel or pause the delivery of that batch.
- Suppression group handling for unsubscribe management.
- IP Pools allow you to group your dedicated Twilio SendGrid IP addresses in order to have more control over your deliverability.

### Dynamic Templates

Create reusable email templates with dynamic content using Handlebars syntax. Templates can have multiple versions and can be managed via the API. You can use dynamic templates to customize your emails and target different segments of your audience with personalized content.

### Contact Management

Easily add contacts and custom field data via CSV, Signup Forms, or API integrations. Contacts can be organized into lists and segments for targeted sending.

- Custom fields for storing additional contact data.
- Segments allow filtering contacts based on conditions.
- Import/export contacts via CSV.

### Marketing Campaigns

Twilio SendGrid Marketing Campaigns is a comprehensive email marketing platform that allows you to create, send, and optimize your email marketing campaigns. It offers powerful features like automation, segmentation, dynamic templates, and real-time analytics to enhance your email marketing efforts.

- SendGrid allows you to automate your email campaigns with simple triggers and a centralized view of your messages. You can set up recurring emails, create time-based drip series, and manage your automation workflows.
- A/B testing for campaigns.
- Signup forms for capturing new contacts.

### Suppression Management

Manage email suppressions including bounces, blocks, spam reports, invalid emails, and unsubscribes. Suppressions are recipient email addresses that are added to unsubscribe groups. Once a recipient's address is on the suppressions list for an unsubscribe group, they will not receive any emails that are tagged with that unsubscribe group.

- Global suppressions and group-level suppressions.
- Retrieve, add, and remove addresses from suppression lists.

### Email Address Validation

The Email Address Validation API provides detailed information about the validity of email addresses, which helps you create and maintain contact lists and reduce bounce rates.

- Real Time Email Address Validation: real time, detailed information on the validity of a single email address. Use this option to prompt users that they've provided an invalid email, prevent invalid emails from entering your database.
- Bulk Email Address Validation: Asynchronous, bulk validation of up to one million email addresses. Use this option to help you remove invalid emails from your existing lists.
- This field contains one of three categories: "Valid", "Risky", or "Invalid". Includes a score from 0 to 1 and typo suggestions.
- Available only on Pro and Premier plans.

### Statistics and Analytics

SendGrid offers advanced analytics and reporting tools that provide detailed metrics on open rates, click-through rates, bounce rates, and more.

- Global stats, category stats, mailbox provider stats, geographic stats, device/browser stats.
- Email Activity Feed for viewing individual message events.

### Sender Authentication

Manage domain authentication (DKIM, SPF) and link branding to improve deliverability. Protect your email communications with comprehensive security features, including SPF, DKIM, DMARC, and TLS encryption.

### IP Address Management

Manage dedicated IP addresses and IP pools. Warm up new IPs and monitor their reputation.

### Inbound Email Parsing

SendGrid's Inbound Parse Webhook allows you to receive emails that get automatically broken apart by SendGrid and then sent to a URL of your choosing. SendGrid will grab the content, attachments, and the headers from any email it receives for your specified hostname.

- Requires MX record configuration pointing to SendGrid.
- Optional spam checking for incoming emails.
- Can receive the full raw MIME message or parsed fields.

### Subuser Management

Manage subusers for organizational separation of sending. The on-behalf-of header allows you to make API calls from a parent account on behalf of the parent's Subusers or customer accounts. You will use the parent account's API key when using this header.

### Teammates and API Key Management

Create and manage API keys with granular permission scopes. API Keys may be assigned certain permissions, or scopes, that limit which API endpoints they are able to access. Manage teammate access to your account.

## Events

SendGrid provides two types of webhooks for receiving event data:

### Event Webhook

The SendGrid Event Webhook sends email event data as SendGrid processes it. This means you can receive data in nearly real-time, making it ideal to integrate with logging or monitoring systems.

Events are grouped into three categories:

**Delivery Events** — Indicate the status of email delivery:

- Processed events occur when a message has been received by Twilio SendGrid and is ready to be delivered.
- Delivered events occur when a message has been successfully delivered to the receiving server.
- Deferred events occur when the receiving server temporarily rejects a message.
- Bounce events occur when the receiving server permanently rejects a message.
- Dropped events occur when your message is not delivered by Twilio SendGrid. Includes a reason (e.g., unsubscribed address, bounced address, spam content).

**Engagement Events** — Indicate recipient interaction:

- Open events occur when a recipient has opened the HTML message. You must enable Open Tracking to receive this type of event.
- Click events occur when a recipient clicks on a link within the message. You must enable Click Tracking to receive this type of event.
- Unsubscribe events occur when recipients click on a message's subscription management link. You must enable Subscription Tracking to receive this type of event.
- Group unsubscribe events occur when recipients unsubscribe from a specific unsubscribe group either by direct link or by updating their subscription preferences. You must enable Subscription Tracking to receive this type of event.
- Group resubscribe events occur when recipients resubscribe to a specific unsubscribe group by updating their subscription preferences. You must enable Subscription Tracking to receive this type of event.
- Spam report events occur when a recipient marks your email as spam.

**Account Events:**

- Account status change events related to compliance action taken by SendGrid.

Configuration options:

- You can select which event types to receive per webhook.
- You may have multiple endpoints depending on your SendGrid plan. Having multiple endpoints means you can deliver different types of event data to different destinations.
- The Event Webhook allows you to verify that the POST requests are coming from SendGrid with either or both Signature Verification and OAuth Verification.
- Custom arguments (custom_args) set during mail send are included in webhook payloads.

### Inbound Parse Webhook

Twilio SendGrid can help process email using the Inbound Parse Webhook. The Inbound Parse webhook parses the contents and attachments for incoming email to a email server, then send that data to a URL of your choice. You can choose how your application handles this parsed data.

- Requires an MX record pointing to `mx.sendgrid.net` and a destination URL.
- Spam Check: Inbound Parse will check incoming emails for spam, then assign them a spam score and report. This will be reflected under spam_score and spam_report in your Parse Webhook post. The user can then determine how this score is interpreted and the severity.
- Option to receive the raw full MIME message or parsed fields (from, to, subject, text, HTML, attachments, headers, etc.).
