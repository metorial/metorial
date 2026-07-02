Now let me fetch the OAuth integration guide for more details on the endpoints, and the marketing webhooks page:# Slates Specification for Brevo

## Overview

Brevo (formerly Sendinblue) is a marketing and CRM platform that provides transactional and marketing email/SMS/WhatsApp messaging, contact management, sales CRM, eCommerce tracking, live chat (Conversations), loyalty programs, and marketing automation. It exposes a REST API (v3) at `https://api.brevo.com/v3/` that covers all platform features.

## Authentication

Brevo supports two authentication methods:

### API Key Authentication

API keys authenticate requests to the Brevo API. Generate an API key from your account settings and include it in the `api-key` header for each request.

- Navigate to **Settings > SMTP & API > API Keys & MCP** in your Brevo account to generate a key.
- The API key is displayed once. Copy the API key immediately and store it securely. You won't be able to view it again after closing the dialog.
- API keys give full access to your Brevo account and should be protected in the same way as a password.
- Include the key in every request via the `api-key` HTTP header.

Example:

```
curl --request GET \
  --url https://api.brevo.com/v3/account \
  --header 'accept: application/json' \
  --header 'api-key: YOUR_API_KEY'
```

### OAuth 2.0 (Authorization Code Flow)

OAuth 2.0 provides token-based authentication for private integrations that require user consent and delegated access. Use OAuth for internal applications within an organization that need user-specific permissions. OAuth is currently only available for private integrations inside an organization. That is: non-public distributable apps. OAuth integrations are not yet intended for public distribution or listing in marketplaces.

- **Registration**: Register your application to receive OAuth credentials. Submit your project details using the application form. After approval, you'll receive credentials and additional information needed to implement OAuth 2.0.
- **Authorization URL**: `https://auth.brevo.com/realms/apiv3/protocol/openid-connect/auth`
  - Parameters: `response_type=code`, `client_id`, `redirect_uri`, `scope=openid`
- **Token endpoint**: `https://api.brevo.com/v3/token`
  - Exchange the authorization code using `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, and `redirect_uri`.
- The response includes an `access_token` (Bearer token, ~12 hour expiry), a `refresh_token` (~1 year expiry), and an `id_token`.
- **Scopes**: `openid email metaInfo profile` (returned in token response).
- The access token is a Bearer token included in the `Authorization` header for subsequent API requests. The refresh token is used to obtain a new access token when the current one expires.

## Features

### Transactional Messaging

Use the API to send transactional and marketing messages across email, SMS, and WhatsApp. Transactional messages include order confirmations, password resets, and other automated communications. Supports HTML templates, dynamic parameters, attachments, and scheduling. Messages can be tagged for tracking purposes.

### Marketing Campaigns

Manage contacts, build audiences, and run targeted campaigns. Create, schedule, and send email and SMS marketing campaigns. Supports WhatsApp campaigns as well. Campaigns can be targeted to specific contact lists or segments.

### Contact Management

Import, create, update, and organize contacts and contact lists. Contacts support custom attributes (e.g., FIRSTNAME, LASTNAME) and can be segmented into lists and folders. Manage contact subscriptions and blocklists.

### Sales CRM

Track sales pipelines and sync eCommerce data to measure campaign performance. Manage companies, deals (with custom pipeline stages and attributes), tasks, notes, and files. Deals can be linked to contacts and companies. Supports multiple pipelines.

### Conversations (Live Chat)

Integrate live chat, receive real-time webhooks, and configure all account settings programmatically. Send and receive messages as an agent, manage automated/targeted messages, track visitor status, and customize the chat widget appearance and behavior via JavaScript API.

### eCommerce

Integrate your eCommerce shop with Brevo for analytics and extended segmentation. Analyse customer conversions from new and returning customers along with metrics about most purchased products. Monitor specific metrics on products like revenue. Retention analysis for customers. Understand how likely it is for your customers to visit again. Manage products, product categories, orders, coupon collections, and revenue attribution via the API.

### Loyalty Programs

Manage loyalty programs including program configuration, member enrollment, point credits/debits, rewards, balance tracking, and tier management.

### Event Tracking

Track custom user events and website activity using the Brevo tracker (via JavaScript or REST API). Events can be used for segmentation, automation triggers, and personalization. Supports both system events and custom-defined events.

### Custom Objects

Create and manage custom data objects beyond standard contacts and deals, enabling more flexible data modeling.

### Account & Settings Management

Manage senders and domains (including DNS authentication/verification), user activity logs, external feeds, invited users, and general account configuration programmatically.

## Events

Brevo supports outbound webhooks across several categories. You will need to define a notification URL or endpoint on your side where the event data will be pushed by Brevo whenever it's triggered. Webhooks can be created via the API or the Brevo UI. Webhooks can optionally be batched (accumulated in 5-minute windows). Webhook calls can be secured with username/password authentication.

### Transactional Email Events

Real-time notifications for transactional email lifecycle. Events include: sent/request, delivered, opened, unique opened, clicked, soft bounce, hard bounce, spam complaint, deferred, blocked, invalid email, error, unsubscribed, proxy open, and unique proxy open. Each event payload includes recipient, message ID, subject, tags, template ID, and timestamps.

### Transactional SMS Events

Notifications for transactional SMS delivery status. Events include: sent, accepted, delivered, replied, soft bounce, hard bounce, subscribe, unsubscribe, skip, blacklisted, and rejected.

### Marketing Events

Possible values for Marketing type webhook: unsubscribed, listAddition & delivered. Tracks contact list changes and marketing campaign delivery events.

### Inbound Email Events

Possible values for Inbound type webhook: inboundEmailProcessed. Triggered when an inbound email is processed by Brevo.

### Conversations Events

Event is triggered when a conversation is started by a visitor or an agent. Event is triggered after each message with some exceptions. Event is triggered when a conversation is finished. Managed separately in Conversations > Settings > Integrations > Webhooks.

### Sales CRM Events

Supported Sales webhook events with respective payloads are available. Covers deal and pipeline activity within the CRM.

### Meetings and Phone Events

Supported Meeting and Phone webhook events and their respective payloads are available.

### Payment Events

Webhook notifications for payment-related events.

### Loyalty Events

Webhook notifications for loyalty program activity (e.g., point transactions, enrollment changes).
