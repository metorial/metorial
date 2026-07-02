# Slates Specification for Mailchimp

## Overview

Mailchimp is an email marketing and marketing automation platform (owned by Intuit) that allows users to manage audiences/contacts, create and send email campaigns, set up automations, and track marketing performance. The Mailchimp Marketing API provides programmatic access to Mailchimp data and functionality, allowing developers to build custom features to do things like sync email activity and campaign analytics with their database, manage audiences and campaigns, and more. Mailchimp also offers a separate Transactional API (formerly Mandrill) for sending event-driven transactional emails.

## Authentication

Mailchimp supports two authentication methods:

### API Key

You can authenticate requests using your API key. You should use an API key if you're writing code that tightly couples your application data to your Mailchimp account data. API keys grant full access to your Mailchimp account.

- Generate an API key from the **Profile > Extras > API Keys** section of your Mailchimp account.
- Copy the generated key immediately and store it in a secure location. You won't be able to see or copy the key once you finish generating it.
- The API key contains a data center suffix (e.g., `us19`). The API base URL is `https://<dc>.api.mailchimp.com/3.0/` where `<dc>` is extracted from the key.
- API keys and OAuth 2 tokens can be used to make authenticated requests the same way. We'll refer to both as tokens. You can either use HTTP Basic Authentication or Bearer Authentication.
- For HTTP Basic Auth, use any string as the username and the API key as the password (e.g., `anystring:<api_key>`).

### OAuth 2.0 (Authorization Code Flow)

If you ever need to access someone else's Mailchimp account data, you should use OAuth 2.

- **Register your app** in your Mailchimp account under **Extras > API Keys > Registered Apps** to obtain a `client_id` and `client_secret`.
- **Authorization URL:** `https://login.mailchimp.com/oauth2/authorize`
  - Parameters: `response_type=code`, `client_id`, `redirect_uri`
- **Token URL:** `https://login.mailchimp.com/oauth2/token`
  - Parameters: `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, `code`
- To retrieve the server prefix, you'll send a GET request to the Metadata endpoint with an Authorization header set to `OAuth <access_token>`: `https://login.mailchimp.com/oauth2/metadata`. You get the user's server prefix which is needed to make calls to the Mailchimp API on the user's behalf. This prefix will change from user to user.
- Mailchimp OAuth does not use granular scopes; the access token inherits the permissions of the authorizing user's role.
- Access tokens do not expire but can be revoked.

## Features

### Audience (List) Management

Your Mailchimp audience is where you store and manage all of your omni-channel contacts. You can create and manage audiences (lists), add/update/remove members, organize contacts with tags, segments, and interest categories (groups). When making a call for information about a particular contact, the Marketing API uses the MD5 hash of the lowercase version of the contact's email address. Contacts can be subscribed, unsubscribed, or managed in bulk.

### Campaign Management

Campaigns are how you send emails to your Mailchimp list. Use the Campaigns API calls to manage campaigns in your Mailchimp account. You can create, update, delete, send, schedule, unschedule, cancel, and replicate campaigns. You can use this as a shortcut to replicate a campaign and resend it to common segments, such as those who didn't open the campaign, or any new subscribers since it was sent. Campaign content (HTML, plain-text, template-based) can be managed separately. Multivariate (A/B testing) campaigns are also supported.

### Automation Workflows

Mailchimp's classic automations feature lets you build a series of emails that send to subscribers when triggered by a specific date, activity, or event. Use the API to manage workflows, emails, and queues for Classic Automations. Does not include Automation flows. You can start, pause, and archive workflows, and manage subscriber queues within automation emails. Customer Journey steps can be triggered via the API.

### E-commerce Integration

Connect your E-commerce Store to Mailchimp to take advantage of powerful reporting and personalization features and to learn more about your customers. You can manage stores, customers, products (with variants), orders (with line items), and carts. Each Customer is connected to a Mailchimp list member, so adding a Customer can also add or update a list member.

### Templates

You can create and manage reusable email templates (both user-created and Mailchimp-provided), including managing the HTML content. Templates can be organized into folders.

### Landing Pages

Manage your Landing Pages, including publishing and unpublishing. You can create, update, delete, publish, and unpublish landing pages, and manage their HTML content.

### File Management

The File Manager is a place to store images, documents, and other files you include or link to in your campaigns, templates, or signup forms. You can upload, list, update, and delete files and organize them into folders.

### Reporting and Analytics

You can retrieve campaign reports including open rates, click rates, bounce statistics, and subscriber activity. E-commerce reports, landing page reports, and audience growth history are also available. Get recent daily, aggregated activity stats for your list. For example, view unsubscribes, signups, total emails sent, opens, clicks, and more, for up to 180 days.

### Surveys

You can retrieve survey data associated with audiences, including survey details and responses.

### Transactional Email (Mandrill)

Mailchimp Transactional (formerly Mandrill) sends targeted and event-driven messages via the API or SMTP. This is a separate API that allows sending transactional messages (with or without templates), searching sent messages, managing sender domains, IP pools, and allowlists/denylists. Requires a separate Transactional API key.

### Custom Events

Use the Events endpoint to collect website or in-app actions and trigger targeted automations. You can post custom events for list members, which can be used as automation triggers.

## Events

Mailchimp supports webhooks through two separate systems:

### Marketing API — Audience Webhooks

Webhooks are a helpful tool that you can use to collect information about audience changes in Mailchimp as they happen. By entering a valid URL that's set up to accept HTTP POST requests, you can receive updates on subscriptions, changed email addresses, campaign sending, and more.

Webhooks are configured per audience (list) and support the following event types:

- **Subscribe** — triggered when a contact subscribes to the audience.
- **Unsubscribe** — triggered when a contact unsubscribes.
- **Profile Update** — triggered when a subscriber's profile information is updated.
- **Cleaned** — triggered when a subscriber's email address is cleaned (e.g., due to bounces).
- **Email Address Change** — triggered when a subscriber changes their email address.
- **Campaign Sending** — triggered when a campaign is sent or cancelled.

You can select specific event types (subscribe, unsubscribe, profile, cleaned, upemail, campaign) and event sources (user, admin, API). Source filtering allows you to control whether notifications fire for changes made by subscribers themselves, account admins, or API calls.

- In order to use webhooks, you must be on the Standard or Premium plan.
- Marketing webhooks do not use cryptographic signature verification; security relies on including a secret parameter in your callback URL.

### Transactional API — Message Event Webhooks

There are three types of webhooks that Mailchimp Transactional currently POSTs: Message events: send, deferral, hard-bounce, soft-bounce, delivered, open, click, spam, unsub, reject.

- **Message Events** — track email delivery lifecycle: send, deferral, hard-bounce, soft-bounce, delivered, open, click, spam complaint, unsubscribe, and reject.
- **Sync Events** — Sync event webhooks allow you to sync data to an external data source. They help you track changes to data stored in Mailchimp Transactional, including: Rejection Denylist Changes and Rejection Allowlist Changes.
- **Inbound Messages** — triggered when inbound emails matching configured routes are received.

You can select which specific event types to listen for when configuring each webhook. Mailchimp signs each webhook request using HMAC-SHA1 via the `X-Mandrill-Signature` header for Transactional webhooks.
