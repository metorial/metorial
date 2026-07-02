# Slates Specification for SendGrid

## Overview

SendGrid (now part of Twilio) is a cloud-based email delivery platform that provides APIs for sending transactional and marketing emails, managing contacts and lists, and tracking email engagement. The SendGrid Email API lets you create, send, and manage emails at scale with RESTful APIs and SMTP relay. The SendGrid Email API supports both transactional and marketing emails.

## Authentication

SendGrid uses **API Key** authentication exclusively. Twilio SendGrid ended support for Basic Authentication with username and password as of Q4 2020.

**API Key (Bearer Token):**

- Authenticate to the SendGrid API by creating an API Key in the Settings section of the SendGrid UI.
- To use an API key, pass an Authorization header with a value of `Bearer <Your-API-Key-Here>`.
- Base URL: `https://api.sendgrid.com/v3/` for global users; `https://api.eu.sendgrid.com` for EU regional subusers.
- You will only be shown your API key one time. Store it securely after creation.

**API Key Permission Levels:**

- Full Access allows the API key to access GET, PATCH, PUT, DELETE and POST endpoints for all parts of your account, excluding billing and Email Address Validation.
- Custom Access customizes levels of access for all parts of your account, excluding billing and Email Address Validation.
- Billing Access allows the API key to access billing endpoints for the account.

API Keys may be assigned certain permissions, or scopes, that limit which API endpoints they are able to access. Key scope categories include: mail send, templates, marketing, contacts, suppressions, stats, webhooks, and more. There is a limit of 100 API Keys per account.

## Features

### Email Sending

Send transactional or marketing emails via the Mail Send API. This includes not only the basic elements like the sender, recipient, subject, and content, but also more advanced features like personalizations, attachments, and dynamic templates. Emails can be scheduled for future delivery and batched for cancellation or pausing. Supports plain text, HTML content, and attachments.

### Dynamic Templates

Create and manage reusable email templates with dynamic content using Handlebars-style substitution. You can use dynamic templates to customize your emails and target different segments of your audience with personalized content. Templates support versioning.

### Contact Management

The Lists API allows you to manage your Marketing Campaigns contact lists. You can create, retrieve, update, and delete lists, as well as add and remove contacts from lists. Contacts can be segmented into multiple lists, support custom fields, and can be imported via CSV or API. Contacts require a unique identifier (typically email address).

### Marketing Campaigns & Automations

Create, schedule, and send marketing email campaigns to contact lists or segments. Automations allow setting up triggered email sequences. Once an Automation has been set live the first time it can no longer be edited.

### Suppressions & Unsubscribe Management

Manage suppression groups (unsubscribe groups), global unsubscribes, bounces, blocks, spam reports, and invalid email addresses. This allows you to maintain sender reputation and comply with email regulations.

### Email Validation

Validate email addresses in real-time to reduce bounce rates and improve deliverability. This is a separate feature that requires its own API key permissions.

### Statistics & Analytics

SendGrid offers advanced analytics and reporting tools that provide detailed metrics on open rates, click-through rates, bounce rates, and more. Statistics can be filtered by category, mailbox provider, browser, device, and geographic location.

### Sender Authentication

Manage domain authentication (SPF, DKIM, DMARC) and branded links to improve deliverability. Configure verified sender identities required for sending emails.

### IP Management

Manage dedicated IP addresses and IP pools. IP Pools allow you to group your dedicated SendGrid IP addresses in order to have more control over your deliverability.

### Subuser Management

Create and manage subusers within a parent account. When making a call on behalf of a Subuser, the property value should be the Subuser's username. This allows organizations to segment sending across different applications or departments.

### Inbound Email Parsing

SendGrid's Inbound Parse Webhook allows you to receive emails that get automatically broken apart by SendGrid and then sent to a URL of your choosing. SendGrid will grab the content, attachments, and the headers from any email it receives for your specified hostname. Requires MX record configuration pointing to SendGrid.

## Events

SendGrid supports two webhook mechanisms for receiving events:

### Event Webhook

The SendGrid Event Webhook sends email event data as SendGrid processes it. This means you can receive data in nearly real-time, making it ideal to integrate with logging or monitoring systems.

You can think about the types of events provided by the Event Webhook in two categories: deliverability events and engagement events. Deliverability events such as "delivered," "bounced," and "processed" help you understand if your email is being delivered to your customers. Engagement events such as "open," and "click" help you understand if customers are reading and interacting with your emails after they arrive.

**Delivery Events:**

- **Processed** – Processed events occur when a message has been received by Twilio SendGrid and is ready to be delivered.
- **Dropped** – Dropped events occur when your message is not delivered by Twilio SendGrid. Includes a reason (e.g., unsubscribed address, bounced address, spam content).
- **Delivered** – Delivered events occur when a message has been successfully delivered to the receiving server.
- **Deferred** – Message delivery was temporarily delayed by the receiving server.
- **Bounce** – Message was rejected by the receiving server.

**Engagement Events:**

- **Open** – Open events occur when a recipient has opened the HTML message. You must enable Open Tracking to receive this type of event.
- **Click** – Click events occur when a recipient clicks on a link within the message. You must enable Click Tracking to receive this type of event.
- **Spam Report** – Recipient marked the email as spam.
- **Unsubscribe** – Recipient clicked the message's unsubscribe link.
- **Group Unsubscribe** – Group unsubscribes occur when recipients unsubscribe from a specific unsubscribe group either by direct link or by updating their subscription preferences.
- **Group Resubscribe** – Group resubscribes occur when recipients resubscribe to a specific unsubscribe group by updating their subscription preferences.

**Configuration options:**

- You can select which specific event types to receive.
- With Unique Arguments and Category parameters, you can insert dynamic data that will help build a clear image of your email program.
- To secure the Event Webhook data, use the Signed Event Webhook, OAuth 2.0, or both.

### Inbound Parse Webhook

Twilio SendGrid can help process email using the Inbound Parse webhook. The Inbound Parse webhook parses the contents and attachments for incoming email to a email server, then send that data to a URL of your choice. You can choose how your application handles this parsed data.

- Requires MX record configuration on the receiving domain.
- Options to enable spam checking on incoming emails and to receive the raw MIME message.
- Parsed data includes: headers, text body, HTML body, from/to/cc addresses, subject, sender IP, and attachments.
