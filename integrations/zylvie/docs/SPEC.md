Now let me look at the actual API documentation to understand the endpoints and webhook capabilities.Now let me fetch the webhook event pages to get complete details:I now have enough information to write the specification.

# Slates Specification for Zylvie

## Overview

Zylvie is a checkout and digital commerce platform for creators, coaches, and small businesses to sell digital products and subscriptions. It provides sales pages, checkout flows, coupon management, license key generation, affiliate tracking, and integrations with payment processors like Stripe and PayPal. It charges zero commission fees on sales.

## Authentication

Zylvie uses **Bearer token authentication** via API keys.

- The Zylvie API is a RESTful API that uses bearer authentication. Each API call must be authenticated using your API key found under your Settings > API page.
- The API key must be included in the `Authorization` header as `Bearer <API_KEY>`.
- Base URL: `https://api.zylvie.com`

**Example:**

```
Authorization: Bearer e97f0aafe4884bc380c81fdb2347dc55
```

No OAuth or additional scopes are required. A single API key provides access to all API features for the authenticated account.

## Features

### Product Management

Create, update, and delete digital products in your store. Products support configurable pricing models including one-time payments, recurring subscriptions, and delayed payments via credit card pre-authorization. You can set display visibility (featured, listed, unlisted, unpublished), attach images and downloadable files, define categories and tags, configure shipping options, and customize post-purchase emails and gated member pages. Products can also be configured to auto-generate license keys for software sales.

- **Pricing models:** `one-time`, `subscription`, `delayed`
- **Subscription options:** configurable interval (day/week/month/year), interval count, and free trial period in days
- **Fulfillment:** downloadable files with customizable download emails, success redirect URLs, success emails with merge fields, and gated page content
- Products can be excluded from workflow automations if needed

### Coupon Management

Create, update, delete, and list discount coupons. Coupons support both percentage and fixed-amount discount types. They can be scoped to specific products or applied storewide, with optional usage limits, start/end dates, and duration limits for subscription discounts. Coupons can also be associated with specific affiliates or restricted to active subscribers of a particular subscription product.

### License Key Management

Manage software license keys that are automatically generated upon purchase. You can:

- **Verify** a license key to check its validity, redemption status, and refund status for a specific product
- **Redeem** a license key to mark it as activated
- **Refund** a license key to invalidate it

Each license key is unique and in UUID format.

### Subscription Verification

Verify the existence and status of a subscription or multiple subscriptions by subscriber email. Returns subscription details including status (incomplete, trialing, active, past_due, canceled, unpaid), billing interval, trial dates, cancellation dates, and subscriber information.

### Account Information

Retrieve details about the authenticated user/account via the `/me` endpoint.

## Events

Zylvie supports webhooks that can be subscribed to either via the Workflows page in the dashboard or programmatically through the API. Each webhook is signed using HMAC-SHA1 with a unique per-workflow secret key, passed in the `Zylvie-Signature` header. Failed deliveries are retried up to 3 times.

### New Sale

Triggered when a buyer completes a purchase where money is transacted. Includes full transaction details such as amount, currency, buyer information, purchased products, applied coupon, subscription details (if applicable), custom fields, affiliate/referrer data, commission info, and any generated license keys.

### New Lead

Triggered when a user submits their name and email to receive a free product or lead magnet. Includes buyer contact information, the free product(s) requested, and any custom fields.

### New Affiliate Sign-Up

Triggered when a visitor signs up to be an affiliate or accepts an invitation to become an affiliate.

### New Subscription

Triggered when a user subscribes to a subscription product, whether starting with a free trial or a paid subscription.

### Subscription Cancellation

Triggered when an existing subscriber cancels their subscription to a subscription product.
