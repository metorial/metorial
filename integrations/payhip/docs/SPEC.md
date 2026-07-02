Now let me fetch the full API reference page and webhooks page for more details.# Slates Specification for Payhip

## Overview

Payhip is an e-commerce platform that enables creators to sell digital products, courses, coaching, memberships, and physical products. Its API currently supports coupon management and software license key verification/management, with plans to expand to more resource types.

## Authentication

Payhip uses **API key authentication** with two different key types depending on the resource being accessed:

### Account API Key

- Used for account-level operations such as coupon management.
- Passed via the `payhip-api-key` HTTP header.
- Found in your Payhip account under **Settings > Developer** tab.
- Example: `--header "payhip-api-key: YOUR_API_KEY_HERE"`

### Product Secret Key

- Used specifically for license key operations (verify, enable, disable, usage tracking).
- Passed via the `product-secret-key` HTTP header.
- Each product has its own secret key, found on the edit product page under the license key settings section.
- Example: `--header "product-secret-key: YOUR_PRODUCT_SECRET_KEY_HERE"`

**Note:** There is also a legacy API (v1) that uses the account API key for license operations, but the current API (v2) uses per-product secret keys for license endpoints. Keep your API keys secret and roll them if you suspect exposure.

## Features

### Coupon Management

- Create, list, and retrieve discount coupons for your store.
- Coupons support percentage-based discounts or fixed-amount discounts.
- Can be scoped to a single product, a collection of products, or all products.
- Configurable options include: coupon code, start/end dates, minimum purchase amount, usage limit, and internal notes.
- Coupons for subscription-priced products with recurring amounts are not yet supported via the API.

### License Key Management

- Verify whether a customer's license key is valid and retrieve associated purchase details (buyer email, product name, usage count).
- Enable or disable license keys programmatically (e.g., disable for terms of service violations; keys are automatically disabled on refund).
- Track license usage by incrementing or decrementing a usage counter, allowing sellers to enforce per-seat or limited-use licensing models.
- Each license key is tied to a specific product and authenticated via that product's secret key.

## Events

Payhip supports webhooks that deliver HTTP POST payloads to a configured endpoint URL when specific events occur in your store. Webhook endpoints are configured in **Settings > Developer**. Multiple endpoints can be specified (comma-separated). Each webhook payload includes an HMAC-SHA256 signature (a SHA-256 hash of your API key) for verification. Failed deliveries (non-200 response) are retried once per hour for up to 3 hours.

### Payment Completed (`paid`)

- Fired when a customer completes a purchase.
- Payload includes transaction ID, buyer email, currency, price (in cents), line items with product details, payment type, fee breakdown, gift status, and discount/coupon usage indicators.

### Payment Refunded (`refunded`)

- Fired when a transaction is refunded (full or partial).
- Payload includes the same transaction details as the paid event, plus the refunded amount and refund date. A partial refund can be identified when the refunded amount is less than the original price.

### Subscription Created (`subscription.created`)

- Fired when a customer starts a new membership subscription.
- Payload includes subscription ID, customer details (email, name), plan name, product name, GDPR consent status, and subscription start date.

### Subscription Canceled (`subscription.deleted`)

- Fired when a customer's subscription is canceled.
- Payload includes the same subscription details as the created event, plus the cancellation date.
