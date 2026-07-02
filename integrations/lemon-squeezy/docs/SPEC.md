Let me get the full list of webhook event types.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Lemon Squeezy

## Overview

Lemon Squeezy is a merchant-of-record platform for selling digital products, software, and subscriptions. It handles payments, tax compliance, subscription billing, license key management, and digital product delivery. The API allows programmatic management of stores, products, orders, customers, subscriptions, discounts, license keys, and checkouts.

## Authentication

The Lemon Squeezy API uses API keys to authenticate requests. You can view and manage your API keys in your Lemon Squeezy account settings.

To access API endpoints, you'll need to create an API key by navigating to **Settings » API** in your Lemon Squeezy dashboard.

The API uses Bearer authentication for all requests. Include the API key in the `Authorization` header:

```
Authorization: Bearer {api_key}
```

The Lemon Squeezy API can be accessed from `https://api.lemonsqueezy.com/v1/`. All requests should be made over HTTPS and every request requires authentication.

You can build and test a full API integration with Lemon Squeezy using Test Mode. Any API keys created in test mode will interact with your test mode store data. When you are ready to go live with your integration, make sure to create an API key in live mode and use that in your production application.

## Features

### Store Management

Retrieve information about your Lemon Squeezy stores, including store details and settings. A store is the top-level entity that contains all products, orders, and other resources.

### Product & Variant Management

The API covers all data types used in your store such as Products, Customers, Discounts and Files. You can use the API to manage your store as well as set up payments for customers, access prior orders and manage ongoing subscriptions and software license keys. Products can have multiple variants representing different pricing tiers or configurations.

### Checkout Creation

A checkout represents a custom checkout page. Checkouts can be used to customize the checkout experience for a specific variant/product without having to create a new product in the dashboard.

- Supports custom pricing, pre-filled customer data, discount codes, and custom metadata.
- Checkout options allow controlling UI elements like button color, logo visibility, trial skipping, and locale.
- Generates a unique checkout URL that can be shared with customers.
- Checkouts can have expiration dates.

### Order Management

Access and manage orders placed in your store. Orders contain details about the customer, pricing (including tax and discounts), currency, and status. You can also issue refunds for orders via the API.

### Subscription Management

The API covers essential subscription management tasks. You'll learn how to programmatically change subscription plans, handle cancellations, implement pausing and resuming functionality, and manage other key aspects of your subscription-based service.

- Change subscription plans (upgrade/downgrade) by updating the variant.
- Cancel and resume subscriptions during the grace period.
- Pausing a subscription is a great option if you want to keep a subscription active but pause regular payment collection.
- Access subscription invoices for billing history.
- Track usage-based billing through subscription items.

### Customer Management

Retrieve and manage customer records associated with your store. Customers are linked to orders, subscriptions, and license keys.

### Discount Management

Create and manage discount codes for your store.

- Supports percentage-based and fixed-amount discounts.
- Discounts can be limited to specific products/variants. They can also be limited to a maximum number of redemptions.
- Discounts support start dates and expiration dates, or can be perpetual.
- Track discount usage through discount redemptions.

### License Key Management

License keys are a feature in Lemon Squeezy, which lets you control access to your external application via orders and subscriptions. You can turn on license keys at a product and variant level. You have options for length of license and how many activations are allowed for each license.

- Validate, activate, and deactivate license keys through a separate License API (does not require API key authentication).
- Retrieve and list license keys and their activation instances.
- If your product is a subscription, the license length is tied to the subscription's lifecycle. When a subscription becomes expired, the related license key's status will automatically become expired.

### File Management

Access digital files associated with your products for download delivery.

### Webhook Management

Webhooks are used to send event data to an external system (i.e. your application). Using the API, you can set up webhooks and subscribe to events programmatically. Create, update, delete, and list webhooks via the API. Each webhook requires a signing secret for request verification and is associated with a specific store.

## Events

Webhooks enable Lemon Squeezy to automatically send data to your application in response to specific store events, ensuring your users remain informed and maintain access to their products.

Webhooks can be configured via the dashboard or the API. Each webhook requires a callback URL, a signing secret (HMAC-SHA256 via the `X-Signature` header), and a selection of event types. Webhooks can optionally be created in test mode.

### Order Events

Events related to order lifecycle:

- `order_created` — This event lets you know when new orders are placed.
- `order_refunded` — Fired when an order is refunded.

### Subscription Events

Events covering the full subscription lifecycle:

- `subscription_created` — This event lets you know when new subscriptions are created.
- `subscription_updated` — This event keeps your application up-to-date with all changes to a subscription. Fired alongside most other subscription events.
- `subscription_cancelled` — Fired when a subscription is cancelled (enters grace period).
- `subscription_resumed` — Fired when a cancelled or paused subscription is resumed.
- `subscription_expired` — Fired when a subscription fully expires.
- `subscription_paused` — Occurs when a subscription's payment collection is paused.
- `subscription_unpaused` — Occurs when a subscription's payment collection is resumed after being previously paused.

### Subscription Payment Events

Events related to subscription billing:

- `subscription_payment_success` — This event lets you save billing histories for your subscribing customers. Fired for both initial payments and renewals.
- `subscription_payment_failed` — Occurs when a subscription renewal payment fails.
- `subscription_payment_recovered` — Occurs when a subscription has a successful payment after a failed payment.
- `subscription_payment_refunded` — Occurs when a subscription payment is refunded.

### License Key Events

Events related to software license keys:

- `license_key_created` — Fired when a new license key is generated after a purchase.
- `license_key_updated` — Fired so you can watch for license key updates and update your application accordingly.

### Affiliate Events

- `affiliate_activated` — Fired so you can watch for affiliate activations and update your application accordingly.
