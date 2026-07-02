# Slates Specification for Tapfiliate

## Overview

Tapfiliate is a cloud-based affiliate tracking platform that enables businesses to create, manage, and optimize affiliate marketing programs. It provides tools for tracking conversions, managing affiliates and commissions, handling payments, and supporting multi-level marketing (MLM) structures.

## Authentication

Authentication with the Tapfiliate API is achieved by sending your `X-Api-Key` along in the header of every request. The API key is passed as an HTTP header:

```
X-Api-Key: "YOUR_API_KEY"
```

You can get your API Key from your Profile Settings > API Key.

All API requests must be made over HTTPS. Plain HTTP calls will fail. API requests without authentication will also fail.

The base URL for all API requests is `https://api.tapfiliate.com/1.6/`.

There are no OAuth flows or scopes. Authentication is solely via the API key. Keep the key secret as it can perform sensitive operations like approving commissions.

## Features

### Affiliate Management

Create, retrieve, list, and delete affiliates. Manage affiliate details including personal information, company data, address, and custom fields. Assign affiliates to groups, manage meta data, and configure payout methods (e.g., PayPal). Supports filtering affiliates by email, referral code, click ID, source ID, parent ID, or affiliate group.

### Affiliate Prospects

Manage potential affiliates before they become full affiliates. Create and list affiliate prospects, assign them to programs and groups. Prospects are promoted to affiliates once they create a conversion or customer.

### Affiliate Groups

Organize affiliates into groups for easier management. Create, update, and list affiliate groups. Groups can be used to apply different commission rates.

### Program Management

Retrieve and list affiliate programs. Manage affiliates within programs, including adding affiliates, approving/disapproving them, updating coupons, and managing program-specific details like commission types, MLM levels, and bonuses. Programs are read-only from the API (cannot be created or modified at the program level).

### Conversion Tracking

Create and manage conversions (sales/transactions). Conversions can be attributed via referral code, coupon code, click ID, customer ID, tracking ID, or asset/source ID combination. Supports setting amounts, currencies, external IDs, and custom meta data. Commissions can be optionally recalculated when updating conversion amounts.

### Customer Management

Track customers referred by affiliates. Customers support statuses such as "trial", "lead", "new", "paying", and "canceled". Useful for SaaS and subscription businesses to implement recurring/lifetime commissions. Customers can be canceled and uncanceled.

### Commission Management

Retrieve, list, and update commissions. Approve or disapprove individual commissions. Add additional commissions to existing conversions, useful for recurring subscription workflows. Filter commissions by affiliate, approval status, and paid status.

### Payment Management

Manage affiliate payments and balances. View all affiliate balances, create payments to settle balances, list payment history, and cancel payments. Supports multi-currency balances.

### Click Tracking

Create clicks programmatically for REST-only integrations (without JavaScript). List and retrieve detailed click information including browser, OS, geolocation, referrer, and landing page data.

- Listing clicks is only available on the Enterprise plan.

### Multi-Level Marketing (MLM)

Set and remove parent-child relationships between affiliates to support multi-level marketing structures. View MLM levels configured per program.

### Meta Data

Attach arbitrary key-value meta data to affiliates, customers, and conversions. Meta data can be managed individually by key or replaced entirely.

## Events

Tapfiliate offers a very flexible webhook system as part of its Triggers feature. Triggers let you perform actions when certain events happen in the platform, such as automating the approval of affiliates, commissions, or generation of payouts. Webhooks are configured in the Tapfiliate dashboard under Settings > Trigger emails & webhooks.

### Affiliate Events

- **Affiliate Created**: Triggered when an individual signs up as an affiliate or is manually added. You can distinguish who initiated this event by using the 'initiator' filter.
- **Affiliate Added to Program**: Triggered each time an affiliate applies or is manually added to a program. You can distinguish who initiated this event by using the 'initiator' filter.
- **Affiliate Approved for Program**: Triggered when an affiliate is automatically approved or manually added to a program.

### Customer Events

- **Customer Created**: Triggered when a customer is created.
- **Customer Updated**: Triggered when a customer's status has changed.

### Payment Events

- **Payment Created**: Triggered when an affiliate's balance is settled in Tapfiliate.

You can assign filters to triggered events, and the filters are different for each specific event. Each trigger can be configured to send a webhook (HTTP POST) to a specified URL with event data.
