Let me get more details on the Boomerang API (v4) resources and check for webhook support.Let me get more details on the Boomerang API documentation and the webhook specifics.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Booqable

## Overview

Booqable is a cloud-based rental software platform for managing equipment and product rentals, including inventory tracking, order management, customer management, online bookings, billing/invoicing, and payment processing. It provides a RESTful JSON API (currently v4, also known as the Boomerang API) that enables programmatic access to all core rental business operations. The API is still in beta and may introduce non-backwards-compatible changes.

## Authentication

Booqable supports two authentication methods, both using the `Authorization: Bearer` header:

### 1. Access Token (Recommended for integrations)

A persistent token used to authenticate API requests.

- **How to obtain:** Navigate to your Booqable account settings page at `{company_slug}.booqable.com/employees/current`, name your new token, and click "Create new authentication method." Choose "Token" as the kind.
- **Usage:** Include the token in the `Authorization` header:
  ```
  Authorization: Bearer {your_access_token}
  ```
- Multiple tokens can be active simultaneously.
- Tokens carry full privileges of the associated employee account.

### 2. Request Signing (Single-Use Tokens)

Generates a JWT token per request for enhanced security. Supports `ES256`, `RS256`, and `HS256` signing algorithms.

- **How to obtain:** Create a new authentication method at `{company_slug}.booqable.com/employees/current` with kind `single_use`. For `ES256`/`RS256`, supply your public key. For `HS256`, a secret is generated for you.
- **Usage:** Sign each request by including request method, path, and body hash in the JWT payload. The resulting JWT is sent in the `Authorization: Bearer` header.
- Tokens expire after a maximum of 10 minutes and can only be used once.

### Company-Specific Endpoint

All API requests must target the company-specific base URL:

```
https://{company_slug}.booqable.com/api/4/
```

The `company_slug` is your Booqable subdomain (the part before `.booqable.com` in your account URL).

## Features

### Customer Management

Manage customer records including contact information, addresses, custom properties, tax profiles, default discounts, and deposit settings. Customers can be searched, tagged, and archived. Customer settings (discount percentage, deposit type, tax region) are automatically applied when assigned to orders.

### Product & Inventory Management

Manage rental products organized into product groups, with support for product variations (e.g., size, color), bulk and trackable inventory types, and sales items. Products support barcodes (QR, EAN, Code 128, etc.), photos, custom properties, and configurable pricing. Bundles allow grouping multiple products into a single bookable package. Collections organize products into hierarchical categories for the online store.

- **Stock management:** Add or remove stock at specific locations, track individual stock items with unique identifiers, and manage temporary/expected stock with date ranges.
- **Availability:** Query real-time inventory levels and breakdowns by location, product, and date range.

### Order Management

Create and manage rental orders through their full lifecycle: new → draft → reserved → started → stopped → archived. Orders support customer assignment, rental period configuration, pickup/delivery fulfillment, discounts (percentage or fixed), deposits, coupons, tax regions, custom line items, and tags.

- **Order fulfillment:** Book products, bundles, or specific stock items onto orders. Start (pick up) and stop (return) items individually or in bulk. Supports partial pickups and returns.
- **Shortage handling:** The system tracks inventory shortages at both location and cluster levels, with configurable warnings and overrides.

### Pricing & Tax

Configure flexible pricing through simple per-period rates, tiered price structures with tiles, or advanced price rulesets with date-based and day-of-week rules. Tax categories and tax regions with multiple rates support both inclusive and exclusive tax strategies. Coupons provide percentage or fixed-amount discounts redeemable online or in the back office.

### Documents (Invoices, Quotes, Contracts)

Generate and manage invoices, quotes, and contracts linked to orders. Invoices auto-generate and update with order changes; they can be finalized and revised. Quotes and contracts can be confirmed and signed with digital signatures. All document types support custom prefixes, numbering, footers, and body content.

### Payments

Process payments through multiple providers (Stripe, third-party apps, or manual). Supports three payment types:

- **Payment Charges:** Direct charges with multiple modes (manual, off-session, request, terminal, capture).
- **Payment Authorizations:** Pre-authorize funds for later capture, with tracking of capturable/captured amounts.
- **Payment Refunds:** Full or partial refunds against previous charges, with provider or manual processing.

Payment methods can be saved per customer for recurring use.

### Locations & Clusters

Manage multiple pickup/return locations and warehouses. Locations can be grouped into clusters that share inventory, enabling cross-location availability and automatic transfer suggestions when shortages occur at specific locations.

### Email & Communication

Send emails to customers using customizable templates with dynamic variables (order data, customer data, document data). Track email history per order and customer. Attach documents as PDF attachments.

### Employee & User Management

Manage team member accounts with configurable permissions (reports, products, settings, exports, etc.). Invite employees via email. Manage customer-facing user accounts for the online store, with support for invitations, email verification, and account disabling.

### Settings & Configuration

Configure global settings including currency, date formats, default pricing/deposit/tax behavior, order time defaults, online store options (availability display, payment strategies, checkout scripts), document formatting, and security settings (SSO, IP restrictions).

### Custom Properties

Define custom fields (text, email, phone, address, date, select) for customers, orders, and product groups. Properties can be linked to default property templates for consistent configuration across resources.

## Events

Booqable supports webhooks for real-time event notifications. Webhook endpoints can be registered via the API to receive HTTP POST notifications when specific events occur. Payloads are available in v1 (form-encoded) or v4 (JSON) format.

### Order Events

- `order.saved_as_draft` — Order saved as draft
- `order.reserved` — Order reserved (items become unavailable)
- `order.started` — Order started (items picked up/delivered)
- `order.stopped` — Order stopped (items returned)
- `order.updated` — Order details updated
- `order.canceled` — Order canceled
- `order.archived` — Order archived

### Customer Events

- `customer.created` — New customer created
- `customer.updated` — Customer details updated
- `customer.archived` — Customer archived

### Product Events

- `product_group.created` — Product group created
- `product_group.updated` — Product group updated
- `product_group.archived` — Product group archived
- `product.created` — Product variation created

### Bundle Events

- `bundle.created` — Bundle created
- `bundle.updated` — Bundle updated
- `bundle.archived` — Bundle archived
- `bundle_item.created` — Bundle item created
- `bundle_item.updated` — Bundle item updated
- `bundle_item.archived` — Bundle item archived

### Document Events

- `invoice.created` — Invoice created
- `invoice.updated` — Invoice updated
- `invoice.finalized` — Invoice finalized
- `invoice.revised` — Invoice revised
- `invoice.archived` — Invoice archived
- `quote.created` / `quote.updated` / `quote.confirmed` / `quote.signed` / `quote.archived`
- `contract.created` / `contract.updated` / `contract.confirmed` / `contract.signed` / `contract.archived`

### Payment Events

- `payment.completed` — Payment completed

### Other Events

- `app.installed` / `app.uninstalled` / `app.configured` / `app.plan_changed` — App lifecycle events
- `cart.completed_checkout` — Cart checkout completed
- `company.destroyed` — Company account destroyed
