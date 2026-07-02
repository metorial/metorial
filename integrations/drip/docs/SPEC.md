Now let me get the full list of webhook events from the API docs:Now I have comprehensive information about Drip's API. Let me compose the specification.

# Slates Specification for Drip

## Overview

Drip is an ecommerce-focused CRM and email marketing automation platform. It provides tools for managing subscribers, running email campaigns, tracking shopper activity (carts, orders, products), building automation workflows, and recording custom events. The API communicates exclusively in JSON over HTTPS.

## Authentication

Drip supports two authentication methods:

### 1. API Token (Private Integrations)

For private integrations, use your personal API Token found in your Drip user settings. The API Token is the username portion of the Basic Authentication scheme, with an empty password.

- Pass the token via HTTP Basic Auth with the token as username and an empty password: `Authorization: Basic base64(YOUR_API_KEY:)`
- An `account_id` is also required for most API calls, which can be found in your Drip account settings.

### 2. OAuth 2.0 (Public Integrations)

For public integrations with Drip, you must use OAuth based authentication.

- **Register your application** at `https://www.getdrip.com/user/applications` to receive a client ID and client secret. A valid callback URL is required.
- **Authorization URL:** `https://www.getdrip.com/oauth/authorize?response_type=code&client_id=<your_client_id>&redirect_uri=<your_redirect_uri>`
- **Token Exchange:** `POST https://www.getdrip.com/oauth/token?response_type=token&client_id=<your_client_id>&client_secret=<your_client_secret>&code=<your_verification_code>&redirect_uri=<your_redirect_uri>&grant_type=authorization_code`
- Tokens do not expire. The verification code expires in 10 minutes.
- Use the access token via Bearer header: `Authorization: Bearer <access_token>`
- The token scope returned is `public`.

## Features

### Subscriber Management

Create, update, list, fetch, and delete subscriber (contact) records. Subscribers have properties including email, name, address, phone, SMS number, custom fields, tags, GDPR consent status, time zone, lead score, and lifetime value. You can unsubscribe subscribers from specific campaigns or all mailings entirely.

### Tagging

List all tags in an account, apply tags to subscribers, and remove tags from subscribers. Tags are free-form strings used for segmentation and automation triggers.

### Email Series Campaigns

List, fetch, activate, and pause email series campaigns (drip sequences). Subscribe people to campaigns with options like double opt-in, starting email index, and custom fields. List subscribers on a campaign and view a subscriber's campaign subscriptions.

### Single-Email Campaigns (Broadcasts)

List and fetch one-time email broadcasts. Filter by status (draft, scheduled, sent) and sort by name, creation date, or send date.

### Workflow Automation

List, fetch, activate, and pause workflows. Start subscribers on a workflow or remove them. Manage workflow triggers, including creating and updating triggers from various providers (e.g., landing page submissions).

### Custom Events

Record custom events (actions) for subscribers, such as "Signed up for a trial" or "Logged in." Events can include custom properties and an optional conversion value. List all custom event actions used in an account.

### Shopper Activity — Orders

Create and update order activity with actions: placed, updated, paid, fulfilled, refunded, or canceled. Orders include line items with product details, billing/shipping addresses, totals, taxes, fees, discounts, and shipping. Drip automatically maintains each subscriber's lifetime value based on orders and refunds.

### Shopper Activity — Carts

Create and update cart records for cart abandonment functionality. Carts include item details, totals, discounts, and a cart URL. Enables cart abandonment dynamic content in emails.

### Shopper Activity — Products

Create, update, and delete product records. Product data enables product-triggered automations such as price drop notifications. Products include details like name, brand, categories, price, inventory, and images.

### Conversions

List and fetch conversion goals configured in the account. Conversions track specific actions (e.g., URL visits) with configurable default values and counting methods.

### Custom Fields

List all custom field identifiers used in an account.

### Forms

List and fetch lead capture forms configured in the account, including their display settings, styling, and URL targeting rules.

### Accounts & Users

List and fetch Drip accounts accessible to the authenticated user. Fetch the authenticated user's profile information.

### Custom Dynamic Content

Pull data from an external API endpoint into Drip emails at render time, enabling real-time personalization (e.g., weather, pricing). Requires providing a GET endpoint that returns JSON. Must be enabled by Drip support.

## Events

Drip supports two methods for webhooks: global webhooks and automation webhooks. Global webhooks are helpful when you want to trigger off of an action within your entire Drip account. Automation webhooks are configured within specific workflows and send HTTP POSTs when a subscriber reaches a particular step.

Global webhooks can be created via the API or the Drip UI. When creating a webhook, you specify a `post_url` and select which events to listen for. By default, all events are enabled except `subscriber.received_email` (opt-in due to high volume). Webhook payloads are JSON and include subscriber data, event properties, account ID, and timestamp.

### Subscriber Lifecycle Events

- **subscriber.created** — A new subscriber is created.
- **subscriber.deleted** — A subscriber is deleted.
- **subscriber.reactivated** — A subscription is reactivated.
- **subscriber.marked_as_deliverable** — A subscriber transitions from undeliverable to deliverable.
- **subscriber.marked_as_undeliverable** — A subscriber becomes undeliverable (hard bounce or spam complaint).

### Email Marketing Subscription Events

- **subscriber.subscribed_to_email_marketing** — A subscriber subscribes to email marketing.
- **subscriber.subscribed_to_campaign** — A subscriber is subscribed to an email series campaign. Includes campaign ID and name.
- **subscriber.removed_from_campaign** — A subscriber is removed from a campaign.
- **subscriber.unsubscribed_from_campaign** — A subscriber unsubscribes from a campaign.
- **subscriber.unsubscribed_all** — A subscriber is unsubscribed from all mailings.
- **subscriber.completed_campaign** — A subscriber completes an email series campaign.

### Subscriber Property Update Events

- **subscriber.applied_tag** — A tag is applied to a subscriber. Includes the tag name.
- **subscriber.removed_tag** — A tag is removed from a subscriber.
- **subscriber.updated_custom_field** — A custom field is updated. Includes field identifier, new value, and previous value.
- **subscriber.updated_email_address** — A subscriber's email address changes.
- **subscriber.updated_lifetime_value** — A subscriber's lifetime value changes.
- **subscriber.updated_time_zone** — A subscriber's time zone changes.
- **subscriber.updated_alias** — A subscriber's alias (e.g., user_id) is updated.

### Email Engagement Events

- **subscriber.received_email** — A subscriber receives an email. Disabled by default; must be explicitly opted in.
- **subscriber.opened_email** — A subscriber opens an email.
- **subscriber.clicked_email** — A subscriber clicks a link in an email. Includes the clicked URL.
- **subscriber.bounced** — An email bounces.
- **subscriber.complained** — A subscriber issues a spam complaint.

### Behavioral Events

- **subscriber.clicked_trigger_link** — A subscriber clicks a tracking/trigger link.
- **subscriber.visited_page** — A subscriber visits a page configured to trigger a rule.
- **subscriber.performed_custom_event** — A custom event is tracked for a subscriber. Includes the action name and custom properties.

### Lead Scoring Events

- **subscriber.became_lead** — A subscriber's lead score surpasses the configured threshold. Only fires when lead scoring is enabled.
- **subscriber.became_non_prospect** — A subscriber is no longer subject to lead scoring.
- **subscriber.updated_lead_score** — A subscriber's lead score changes. Includes current and previous scores.
