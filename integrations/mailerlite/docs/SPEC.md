Let me get more details on the API features available.Now let me get details on the webhook events and automations/forms APIs:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for MailerLite

## Overview

MailerLite is an email marketing platform that provides subscriber management, email campaign creation and delivery, marketing automations, and signup forms. MailerLite is an email marketing service provider with focus on simplicity and beautiful email design. It also offers an E-commerce API that allows connecting an external shop to your account, enabling features such as abandoned cart automations, post-purchase emails, and sales tracking.

## Authentication

MailerLite uses **API key (Bearer token)** authentication exclusively.

API keys are a quick way to implement machine-to-machine authentication. You can generate an API key by opening MailerLite, navigating to Integrations and choosing MailerLite API. Then click "Generate new token" and give it a name. Once the key is generated, copy and store it immediately — MailerLite will not be able to show it again, as they don't store API keys in plain text for security reasons.

**Base URL:** `https://connect.mailerlite.com/api`

**Required headers for every request:**

- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer {API_KEY}`

API V1 and V2 only work with MailerLite Classic and will eventually be deprecated. All new MailerLite accounts should use the latest API.

**Versioning:** You can optionally lock the API version by providing the `X-Version` header with a date value (e.g., `X-Version: 2038-01-19`). If omitted, the latest version is used.

## Features

### Subscriber Management

Create, update, list, fetch, delete, and "forget" (GDPR-compliant removal) subscribers. If a subscriber already exists, it will be updated with new values. This is a non-destructive operation, so omitting fields or groups will not remove them from a subscriber. You can also fetch individual subscriber activity logs (opens, clicks, group changes, etc.) and retrieve total subscriber counts. Subscribers can be filtered by status (active, unsubscribed, unconfirmed, bounced, junk).

### Groups

Groups are used to organize subscribers into lists. You can create, update, list, and delete groups. Subscribers can be added to or removed from groups. Each group tracks statistics like active count, open rate, and click rate.

### Segments

Segments allow listing all segments in your account and fetching subscribers belonging to a segment. Segments can be updated or deleted. Segments are rule-based groupings of subscribers (created in the MailerLite UI) and the API provides read access to their membership.

### Custom Fields

Manage custom subscriber fields (e.g., name, company, phone). You can create, update, list, and delete custom fields that store additional data on subscribers.

### Campaigns

You can create, update, or send campaigns. Campaigns can be listed and filtered by status (draft, ready, sent) and type (regular, A/B, resend). You can schedule campaigns for a specific date/time, cancel ready campaigns, and delete campaigns. For sent campaigns, you can retrieve subscriber activity reports (opens, clicks, etc.).

- Campaign types: regular, A/B split, resend to unopened.
- Content can be set using HTML or the built-in editor.
- Campaigns can target specific groups, segments, or all subscribers.

### Automations

List and retrieve automations configured in your account. You can view automation details and subscriber activity within automations. Automations themselves are primarily built through the MailerLite UI; the API provides read access and the ability to fetch subscriber activity for each automation.

### Forms

List and retrieve signup forms (pop-ups, embedded forms, promotions). Forms can be filtered by type. You can also fetch the subscribers who signed up through a specific form.

### E-commerce

The E-commerce API allows connecting an external shop to your MailerLite account. E-commerce API endpoints enable features such as e-commerce automation (abandoned cart automations, post-purchase emails, etc.), product import into newsletters, sales tracking and more.

- **Shops:** Create, update, list, and delete shop connections.
- **Products:** Manage products and product categories.
- **Orders:** Create, update, and track orders.
- **Carts & Cart Items:** Manage shopping carts and their items for abandoned cart functionality.
- **Customers:** Manage e-commerce customer records.
- **Import:** Bulk import e-commerce data.

### Timezones and Campaign Languages

Retrieve lists of supported timezones and campaign languages for use when creating or scheduling campaigns.

## Events

Webhooks allow you to subscribe to real-time notifications about various events that occur in MailerLite. For example, when a new subscriber is added to your account, an HTTP POST callback is sent to your provided URL with a payload containing the new subscriber.

Webhooks are managed via the API (create, list, update, delete). Each webhook can subscribe to one or more events, has a configurable URL, can be enabled/disabled, and supports optional event batching. Webhook requests include a Signature header (HMAC SHA-256) generated from the payload JSON using the webhook's secret, which can be used to verify authenticity.

### Subscriber Events

| Event                             | Description                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `subscriber.created`              | A new subscriber is added to the account.                                       |
| `subscriber.updated`              | A subscriber's custom fields are updated or they confirm their subscription.    |
| `subscriber.unsubscribed`         | A subscriber becomes unsubscribed.                                              |
| `subscriber.added_to_group`       | A subscriber is added to a group. Payload includes group details.               |
| `subscriber.removed_from_group`   | A subscriber is removed from a group. Payload includes group details.           |
| `subscriber.bounced`              | An email address bounces.                                                       |
| `subscriber.spam_reported`        | A subscriber marks a campaign as spam.                                          |
| `subscriber.automation_triggered` | A subscriber starts an automation. Payload includes automation details.         |
| `subscriber.automation_completed` | A subscriber finishes an automation. Payload includes automation details.       |
| `subscriber.deleted`              | A subscriber is deleted or forgotten. Requires `batchable` to be set to `true`. |
| `subscriber.active`               | A subscriber's status is set to active.                                         |

### Campaign Events

| Event            | Description                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `campaign.sent`  | A campaign has finished sending. Payload includes campaign name and total recipients.                                      |
| `campaign.open`  | A subscriber opens a campaign. Requires `batchable` to be set to `true`.                                                   |
| `campaign.click` | A subscriber clicks a link in a campaign. Requires `batchable` to be set to `true`. Payload includes the clicked link URL. |
