Let me get more details on the API v5 reference to understand the full feature set.Now let me check the OAuth details and authentication page more carefully.Now I have enough information to write the specification.

# Slates Specification for Omnisend

## Overview

Omnisend is an ecommerce marketing automation platform that provides email, SMS, and push notification campaigns. It offers a REST API for managing contacts, products, orders, events, campaigns, and automations, primarily used to connect custom ecommerce platforms or extend existing integrations.

## Authentication

Omnisend supports two authentication methods:

### 1. API Key

The primary authentication method is an API key, provided via the `X-API-KEY` header with every request.

- Generate an API key by going to Store Settings → API keys → click Create API key.
- Permissions can be configured per key to control which resources (Contacts, Campaigns, Orders, Products, etc.) the key can access.
- The key cannot be viewed again after creation; if lost, a new one must be generated.
- Base URL: `https://api.omnisend.com/v5/`

Example:

```
GET https://api.omnisend.com/v5/contacts
X-API-KEY: your-api-key
```

### 2. OAuth 2.0 (Authorization Code Grant)

Omnisend supports the OAuth Authorization Code Grant flow in v5 endpoints. To use it, you must fill in an application form and Omnisend will provide OAuth credentials (Client ID and Client Secret).

**Flow:**

1. **Authorization Request:** Redirect the user to `https://app.omnisend.com/oauth2/authorize` with `client_id`, `redirect_uri`, `response_type=code`, `scope` (space-separated resource names), and a random `state` value.
2. **Callback:** After user consent, Omnisend redirects to your callback URL with a `code` parameter.
3. **Token Exchange:** POST to `https://app.omnisend.com/oauth2/token` with `code`, `grant_type=authorization_code`, `client_id`, `client_secret`, and `redirect_uri`. The response includes `access_token`, `refresh_token`, and `scope`.

API requests use the access token as a Bearer token in the `Authorization` header. Scopes are defined per endpoint in the API documentation and control which resources the app can access.

## Features

### Contact Management

Sync subscriber lists, add custom properties, and update contact details. Contacts can be listed, created, updated, and retrieved by ID. Contacts can have email and SMS subscription statuses managed independently.

### Product Catalog

Manage a product catalog within Omnisend by creating, updating, deleting, and listing products and product categories. This enables the Product Picker in Omnisend's Email Builder and automation workflows.

### Ecommerce Event Tracking

Omnisend provides an events endpoint that allows you to send events to Omnisend, used to track customer behavior and trigger automations. Predefined events include:

- **Cart events:** added product to cart, started checkout
- **Order events:** placed order, paid for order, order fulfilled, order refunded, order canceled
- **Browsing events:** viewed product

Custom events can also be sent (e.g., "trial started," "subscription renewed") to trigger automation workflows.

### Automation Workflows

Pass cart data to trigger abandoned cart emails/SMS. Pass order data to trigger order confirmation and shipping confirmation transactional emails. Track product views and cart additions to enable product abandonment and browse abandonment workflows. Automations can be listed via the API.

### Campaigns

List and view campaigns. Campaigns cover email newsletters and other marketing messages managed within Omnisend.

### Brand Management

Retrieve and configure brand information, including connecting a brand/store to Omnisend.

### Analytics & Reporting

Export analytics data with the Statistics API — query campaign and workflow performance, engagement metrics, revenue attribution, deliverability, and audience growth data. This feature is currently in beta.

## Events

Omnisend does not offer traditional API-based webhook subscriptions that can be programmatically registered or managed. The Omnisend API allows you to send events to their platform, but does not offer traditional webhooks for subscribing to notifications. The focus is on sending customer behavior data to Omnisend rather than receiving real-time updates from Omnisend.

Omnisend does support webhooks as an action within automation workflows — these are HTTP callbacks that send real-time data from Omnisend to other services when specific automation events occur, allowing you to notify third-party systems, send messages through platforms like WhatsApp, or trigger custom workflows. However, these are configured manually within the Omnisend UI as part of automation flows, not through a programmable webhook subscription API.
