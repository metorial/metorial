Now I have enough information to compile the specification. Let me also fetch the permissions/scopes page to get details on available scopes.# Slates Specification for Instacart

## Overview

Instacart is a grocery delivery and pickup platform that connects customers with personal shoppers who pick and deliver items from local retailers. It offers two distinct API suites: the **Instacart Developer Platform (IDP)** for app developers to create shoppable recipe and shopping list experiences, and **Instacart Connect** for retailer partners to integrate fulfillment, advertising, transaction, and post-checkout capabilities into their e-commerce sites. The Developer Platform API is built for app developers, while Connect APIs are built for retailer partners who want to add Instacart fulfillment capabilities to their e-commerce sites.

## Authentication

Instacart uses two different authentication methods depending on which API suite is being used:

### Instacart Developer Platform (IDP) — API Key Authentication

API keys are used to authenticate requests to the Instacart Developer Platform. Keys are created via the Instacart Developer Dashboard and passed as a Bearer token in the `Authorization` header.

- API keys can be configured with different permission levels: Read-only (retrieve data only), Read-write (full access to create, read, update resources), and Admin (full access including sensitive operations).
- Keys can be designated for Development or Production environments.
- Development server: `https://connect.dev.instacart.tools`
- Production server: `https://connect.instacart.com`
- Example header: `Authorization: Bearer <API-key>`

### Instacart Connect — OAuth 2.0 (Client Credentials)

The Connect APIs use OAuth 2.0 to authenticate requests and authorize access to resources. Each OAuth application has a set of credentials (client ID and secret) that authenticate users and define permissions. You exchange these credentials for a bearer token and then present that token in Connect API requests.

**Token endpoint:** `POST https://connect.instacart.com/v2/oauth/token`

**Request body parameters:**

- `client_id` — Your client ID provided by Instacart
- `client_secret` — Your client secret provided by Instacart
- `grant_type` — Typically `client_credentials`; can also be `authorization_code` or `fulfillment_user_assertion` depending on the API
- `scope` — The API scope to access (see below)

The token is valid for 24 hours. During this period, reuse the same token. After 24 hours, you must generate a new token.

**Available scopes:**

- `connect:fulfillment` — Access stores, service options, orders, and order management
- `connect:compliance` — Manage customer data in accordance with privacy laws
- `connect:post_checkout` — Access order detail and status (uses `fulfillment_user_assertion` grant type)
- `connect:ian` — Carrot Ads API for serving and tracking advertisements
- `connect:data_ingestion` — Catalog data ingestion
- `Connect::Orders::RatingService` — Order feedback
- `account_linking` — Link Connect user accounts to Instacart accounts (uses `authorization_code` grant type)

You can specify more than one scope if the grant type is the same. Separate the scope values with a comma.

## Features

### Recipe & Shopping List Pages (Developer Platform)

Create recipe pages complete with ingredient matching and shopping list generation. You provide recipe details (title, image, ingredients, instructions) and the API returns a hosted link on Instacart Marketplace where users can match ingredients to available products and add them to their cart. Generate smart shopping lists that map to available products at nearby retailers, with real-time inventory and pricing.

- Users are redirected to Instacart to complete checkout.
- Developers using the IDP Public API cannot access Instacart data but receive a link to an Instacart-hosted landing page.
- Can filter by retailer using retailer keys obtained from the retailers API.

### Retailer Discovery (Developer Platform)

Look up nearby retailers available on Instacart Marketplace by postal code and country code. Useful for customizing recipe or shopping list pages to show products from a specific store.

### Order Fulfillment (Connect — Retailers Only)

The Fulfillment API brings together grocery, delivery, and pickup capabilities. Retailers can offer full-service shopping (where Instacart shoppers pick items and suggest replacements) and same-day or scheduled delivery and pickup options.

- Manage user accounts for customers on the retailer's site.
- Query available stores and service options (delivery time slots, pickup windows, ETAs).
- Create, update, and cancel orders with item details.
- Support for delivery, pickup, last mile delivery, and dispatch last mile delivery workflows.
- When an order transitions to a new status, you can notify customers to keep them up to date.
- Includes order feedback (ratings) collection.
- Connect APIs (Fulfillment, Post-checkout, etc.) are for retailers only and not available to developer partners.

### Post-Checkout Experience (Connect — Retailers Only)

Offer customers an order status page where they can interact with shoppers and track their orders. Requires a user-scoped access token.

### Transaction Reporting (Connect — Retailers Only)

Send point of sale transaction information to Instacart. No specific scope is required; uses `client_credentials` grant type.

### Carrot Ads (Connect — Retailers/Publishers)

Serve banner ads and promotional content across your storefront, creating additional revenue streams. Features include:

- Sponsored product ads that integrate into product grids.
- Brand pages: create custom branded shopping experiences that showcase a brand's full product catalog and promotional content.
- Performance tracking and analytics: monitor ad impressions, clicks, conversions, and revenue.
- Requires a retailer ID and Connect user accounts for ad targeting.

### Catalog Management (Connect — Retailers Only)

Ingest and manage product catalog data into the Instacart platform. Authenticated with the `connect:data_ingestion` scope.

### Compliance / Privacy (Connect — Retailers Only)

Manage Storefront Pro customer data in accordance with privacy laws. Uses the `connect:compliance` scope.

### Account Linking (Connect — Retailers Only)

Link a customer's retailer-side Connect user account to their existing Instacart account. Uses the OAuth `authorization_code` grant type with the `account_linking` scope.

### Sandbox / Testing (Connect — Retailers Only)

Simulate order status changes and callbacks while testing your integration, both programmatically via the Sandbox API and through a UI-based testing center.

## Events

Instacart Connect can notify you of order status change events through callbacks (webhooks). To get notifications about specific events, you need to set up one or more webhooks. Webhooks are configured via a self-service configuration tool in the Instacart Developer Dashboard. To enable event callbacks, OAuth v2.0 must be enabled on the callback endpoint.

Events are only available for the **Connect APIs** (retailer partners). The Developer Platform API does not support webhooks.

### Order Lifecycle Events

Notifications for key order state transitions across delivery, pickup, and last mile delivery workflows:

- **Brand New** — Order successfully created in Instacart's system.
- **Acknowledged** — Order acknowledged by a shopper.
- **Picking** — Shopper begins fulfilling the order (delivery and pickup only).
- **Checkout** — All picking for the order is completed (delivery and pickup only).
- **Staged** — Order placed in the staging area after shopping is complete.
- **Delivering** — Order has left the store and is en route (delivery and last mile only).
- **Delivered** — Order successfully delivered or picked up.
- **Rescheduled** — Order rescheduled to another time.
- **Canceled** — Order canceled, with detailed cancellation reason and type.

### Item-Level Events

Real-time updates on individual item statuses during the picking process (delivery and pickup only):

- **Item Found** — Shopper marks an item as found.
- **Item Replaced** — Shopper substitutes an item with a replacement.
- **Item Refunded** — Refund initiated on an item.
- **Item Not Picked** — Item status moves from found to not found.
- **Order Item Replacement** — Aggregated event when a shopper replaces an item (includes all order items).
- **Order Item Refund** — Aggregated event when a shopper refunds an item (includes all order items).

### Delivery Tracking Events

Location and timing updates during the delivery phase (delivery and/or last mile only):

- **Order Location** — Periodic shopper GPS coordinates during delivery. Frequency is configured per account.
- **Late Delivery** / **Late Pickup** — Delivery or pickup time window has changed.
- **Customer Missing** — Shopper cannot find the customer at the delivery address.
- **At Store ETA** — Periodic shopper ETA updates to the store (last mile only, every 2 minutes).

### Pickup-Specific Events

Events specific to the pickup workflow:

- **Customer Acknowledged** — Runner is collecting bags from staging.
- **Pickup Runner Started** — Runner heading outside with bags.
- **Unable to Find Customer** — Runner cannot locate the customer.
- **Runner Not Found** — No pickup runner available; curbside transitions to in-store pickup.
- **Pickup Geofence Reached** — Customer arrives at the store's virtual geofence.

### Last Mile Delivery Events

Events specific to last mile delivery workflows:

- **At Store** — Shopper arrives at the store.
- **Acknowledged for Delivery** — Shopper acknowledges the last mile order.
- **Bags Verified** — Shopper verifies bags at the store.
- **Arrival at Customer** — Shopper arrives at the customer's location.

### Post-Delivery Events

- **Tip Adjustment** — Tip updated after delivery completion (delivery and last mile only).
- **Rating Updated** — Order rating created or updated.
- **Rating Reminder** — Sent one hour after delivery if no rating has been assigned.
