# Slates Specification for Shippo

## Overview

Shippo is a multi-carrier shipping API that provides a unified interface to connect with 85+ shipping carriers (including USPS, FedEx, UPS, and DHL). It enables comparing rates from multiple carriers, managing addresses, creating shipping labels, tracking packages, scheduling pickups, handling returns, and managing customs declarations.

## Authentication

Shippo supports two authentication methods:

### API Token Authentication

Authentication is done by including `Authorization: ShippoToken <token>` in the request header. You can find your token on the Shippo API settings page.

There are two types of keys: **Live keys** for production use and **Test keys** for testing and development. Live keys begin with `shippo_live_`. Test keys begin with `shippo_test_`.

You can only see your full API key once — store it in a secure place. If you lose your API key, you can generate a new one.

**Base URL:** `https://api.goshippo.com/`

**Example:**

```
curl https://api.goshippo.com/shipments/ \
  -H "Authorization: ShippoToken shippo_live_xxxxx" \
  -H "Content-Type: application/json"
```

### OAuth 2.0 (for Platform Partners)

OAuth is available for platforms and marketplaces that want to make API calls on behalf of their users. To get started, you must contact partnerships@goshippo.com with your company name and callback URL.

The OAuth flow works as follows:

1. The user clicks a link that takes them to the Shippo OAuth flow, where they are prompted to log in or register and grant your platform permission.
2. The user is redirected back to your site with an authorization code.
3. You make a request to the OAuth token endpoint to fetch the user's access token.

**Authorization URL:** `https://goshippo.com/oauth/authorize?response_type=code&client_id=YOUR_PARTNER_ID&scope=*&state=YOUR_RANDOM_STRING`

**Token Exchange URL:** `https://goshippo.com/oauth/access_token` (POST with `client_id`, `client_secret`, `code`, `grant_type=authorization_code`)

Shippo doesn't expire the access token — it remains valid forever and no refresh mechanism is needed.

After obtaining the token, authenticate with `Authorization: Bearer <access_token>`.

## Features

### Address Management & Validation

Create and store address objects for use in shipments. Addresses can be validated to prevent failed deliveries and shipping errors using Shippo's address validation service. Supports both residential and commercial addresses worldwide.

### Shipment Creation & Rate Shopping

A shipment object contains to and from addresses and parcel details. You can use the shipment object to retrieve shipping rates and purchase a shipping label. Creating a shipment automatically generates rates from all connected carriers, allowing you to compare and select the best option. Supports extra services like signature confirmation, insurance, and third-party billing.

### Shipping Label Purchase

Purchase shipping labels by selecting a rate from a shipment. Labels can be generated in multiple formats (PDF, PNG, ZPL). Labels can also be created with a single API call if you don't need to display available rates beforehand. Supports multi-piece shipments.

### Package Tracking

The Tracking API allows you to track shipments across all carriers with normalized data, full tracking history, and real-time updates. You can track any shipment by providing a carrier token and tracking number. Tracking statuses include PRE_TRANSIT, TRANSIT, DELIVERED, RETURNED, FAILURE, and UNKNOWN, with detailed sub-statuses.

### Customs Declarations & International Shipping

Customs declarations include relevant information, including one or multiple customs items, needed for customs clearance for international shipments. Supports content types, incoterms, tariff numbers, and tax identifiers. Commercial invoices are automatically generated for international shipments.

### Order Management

Use orders to load orders from your system to Shippo. You can create, retrieve, list, and manage orders programmatically, and retrieve shipping rates, purchase labels, and track shipments for each order.

### Carrier Account Management

You can create, modify, delete, and specify which shipping carriers you want to use via the API. This allows connecting your shipping accounts to compare and purchase different rates. Supports both bringing your own carrier accounts and using Shippo's discounted carrier accounts.

### Manifests & SCAN Forms

A manifest is a single-page document with a barcode that carriers can scan to accept all packages into transit without scanning each item individually. Manifests are close-outs of shipping labels of a certain day. Daily manifests are required by some carriers.

### Pickups

Shippo's pickups endpoint allows you to schedule pickups with USPS and DHL Express for eligible shipments that you have already created. Pickup requests include location details, available time windows, and references to the transactions to be picked up.

### Refunds

Refunds are reimbursements for successfully created but unused shipping labels or other charges. You must explicitly request a refund for unused labels.

### Rates at Checkout

A tool for merchants to display up-to-date shipping estimates based on what's in their customers' cart and where they're shipping to. Merchants set up curated shipping options for customers in the checkout flow based on data in the shopping cart. Uses service groups to organize carrier service levels into customer-facing shipping options.

### Parcel Templates

Define reusable parcel templates with preset dimensions and weight. Supports both carrier-defined templates (e.g., USPS Flat Rate Box) and user-created custom templates. When using a carrier parcel template, rates may be limited to that carrier. You can create user parcel templates using a carrier parcel template.

### Platform Accounts

Shippo Accounts are used by platform accounts to create and manage managed Shippo accounts. Managed accounts are headless accounts representing your customers, opaque to end customers. They can be used by marketplaces, e-commerce platforms, and third-party logistics providers.

## Events

Shippo supports webhooks for real-time event notifications. You can create webhooks to receive instant notifications whenever there's a status change in tracking, batch labels, or transactions. Webhooks can be configured for either live or test mode.

### Tracking Updates (`track_updated`)

Fired for tracking status updates. The POST request body contains a JSON of the Tracking object. Shippo regularly requests updates from carriers and sends an update to the webhook whenever there's a change in status.

### Transaction Created (`transaction_created`)

Sent whenever a transaction (label purchase) is created in your account. The POST request body contains a JSON of the Transaction object that was created.

### Transaction Updated (`transaction_updated`)

Sent whenever a transaction is updated in your account. The POST request body contains a JSON of the Transaction object that was updated.

### Batch Created (`batch_created`)

Sent when a batch label operation is created.

### Batch Purchased (`batch_purchased`)

Sent when a batch label purchase has completed.

### All Events (`all`)

Sent when any of the supported events occur. Acts as a catch-all for events.
