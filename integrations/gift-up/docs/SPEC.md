# Slates Specification for Gift Up!

## Overview

Gift Up! is a digital gift card platform that allows businesses to sell, manage, and redeem gift cards (both digital and physical) on their website or e-commerce platform. It supports currency-backed and unit-backed gift cards, with an embeddable checkout, payment processing via Stripe/PayPal/Square, and a REST API for programmatic management.

## Authentication

Gift Up! uses API keys to allow access to the API. You can get a new API key in the Gift Up! dashboard.

To generate an API key, navigate to **Settings → Integrations → Gift Up! REST API → API Keys** in the Gift Up! dashboard, and click "Create a new API key."

Gift Up! expects the API key to be included in all API requests to the server as a Bearer token in the `Authorization` header:

```
Authorization: Bearer {{apikey}}
```

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

There are no OAuth flows, scopes, or additional credentials required. The API key is the sole authentication mechanism. Each API key is tied to a single Gift Up! account (company).

A built-in test mode is available by passing the header `x-giftup-testmode: true`, which operates against a sandbox data environment without affecting live data.

## Features

### Gift Card Management

Retrieve, list, update, void, reactivate, and manage gift cards. Gift cards can be backed by either a currency balance or a unit balance. You can update properties like title, expiry date, valid-from date, recipient details, SKU, and terms. Gift cards can be filtered by status (active, expired, redeemed, voided), creation/update date, recipient or purchaser email, SKU, or order ID.

### Gift Card Redemption

Redeem a gift card partially (by specifying an amount/units), redeem in full, undo a previous redemption, or top up a gift card's balance. Each redemption returns a transaction ID and the remaining balance. Redemptions can include a reason, location, and custom metadata for tracking.

### Balance Transfers

Transfer balances from one or more source gift cards to a single destination gift card.

### Order Management

Create orders containing one or more gift cards programmatically. Orders support recipient details (with optional scheduled email delivery), custom fields, sales taxes, tips, service fees, discounts, shipping addresses, and metadata. You can control whether Gift Up! sends emails to recipients. Orders can also be retrieved, updated (purchaser info), annotated with notes, and marked as posted (for physical gift cards).

### Items (Products) for Sale

Create, update, delete, and list the items that appear in the Gift Up! checkout. Items define the gift card products available for purchase, including name, description, price, value, backing type (currency or units), stock levels, per-order limits, availability windows, expiry settings, valid-from settings, custom pre-generated codes, SKUs, and additional terms. Items can be organized into item groups.

### Item Groups

Create, update, delete, and list item groups, which are containers for organizing items in the checkout. Groups have a name, description, sort order, and auto-expand setting.

### Promotions

List all promotions configured in your account. Promotions define checkout discounts with configurable benefits (percentage/fixed discounts, extra credit, additional items), triggers (promo codes, minimum/maximum spend, specific items/groups), usage tracking, and limitations (date ranges, usage caps).

### Reports & Transactions

Retrieve financial transaction reports for your account. Transactions cover events like orders placed, gift cards created, redemptions, credit additions, expirations, voids, and reactivations. Can be filtered by date range, event type, user, location, and gift card code.

### Account Settings

Read and update checkout settings (theme, logo, fonts, colors, service fees, tips, redirect URLs, balance checker), email settings (sender info, subject lines, custom text for gift card and receipt emails), gift card settings (default description, barcode format, expiry, code format, general terms), and shipping settings (digital/postal fulfilment, shipping options).

### Gift Card Artwork

List, upload, replace, and delete gift card artwork images used in the checkout and on gift cards.

### User Management

Invite, list, retrieve, update, and delete users who have access to your Gift Up! account. Users can be administrators or redeem-only users, with configurable permissions including PIN, location restrictions, and redeem app visibility settings.

### Locations

List all physical locations configured in your account, used for tracking where gift cards are sold or redeemed.

### Stripe Integration

Configure and retrieve your Stripe payment gateway connection, including API keys, supported payment methods (iDEAL, Bancontact, Klarna, PayPal, etc.), Stripe Connect settings, 3D Secure, and statement descriptors.

### Company Information

Retrieve basic company/account details including name, currency, and onboarding status.

### Webhook Management

Programmatically register, list, retrieve, and delete webhook subscriptions via the API (see Events section below).

## Events

Gift Up! supports webhooks that can be configured either through the dashboard or via the API. When Gift Up! posts data to your webhook, it signs each request to your endpoint with a secret you specified when creating the webhook, so that you can verify the request originated from Gift Up! Webhooks are registered per event type and can be set to fire only for test mode data.

### Order Created

Fires when a new order is placed in the Gift Up! checkout or created via the API. The payload includes the full order object with revenue, purchaser details, custom fields, sales taxes, promotions, and metadata.

### Gift Card Created

Fires when a new gift card is created (as part of an order or via the API). The payload includes the full gift card object with code, balance, recipient info, and formatted currency values.

### Gift Card Redeemed

Fires when a gift card is redeemed. The payload includes the full gift card object plus the redeemed amount/units, who performed the redemption, and when it occurred.

### Gift Card Updated

Fires when a gift card is updated (e.g., properties changed, topped up, voided, reactivated). The payload includes the full gift card object reflecting the current state.

**Configuration options:**

- **Target URL**: The endpoint where Gift Up! will POST the webhook payload.
- **Secret**: An optional shared secret used to sign requests via HMAC-SHA256 for verification.
- **Test mode**: When enabled, the webhook only fires for test data events.
