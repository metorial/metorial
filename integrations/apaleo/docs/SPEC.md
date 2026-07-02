Let me get the full list of webhook events and the complete scopes list.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Apaleo

## Overview

Apaleo is a cloud-based, API-first property management system (PMS) for hotels and serviced apartments. It provides APIs for managing reservations, inventory, rates, guest profiles, folios, invoices, payments, and property settings. The platform is built on MACH architecture (Microservices, API-first, Cloud-native, Headless).

## Authentication

Apaleo uses OAuth 2.0 to authenticate and authorize users to make API requests. The Identity API implements OpenID Connect for handling authentication.

**Identity Provider:** `https://identity.apaleo.com`

**Key Endpoints:**

- Discovery document: `https://identity.apaleo.com/.well-known/openid-configuration`
- Authorization endpoint: `https://identity.apaleo.com/connect/authorize`
- Token endpoint: `https://identity.apaleo.com/connect/token`
- Revocation endpoint: `https://identity.apaleo.com/connect/revocation`

**Supported Grant Types:**

1. **Authorization Code Grant (Connect Client):** The most secure and preferred method to authenticate users. With connect clients, you only need the account admin to authorize your application, and you get immediate access to their account. Requires a client ID, client secret, and redirect URI. Supports refresh tokens when the `offline_access` scope is requested.

2. **Client Credentials Grant (Simple Client):** When using simple clients, you need to create new client credentials per each hotel account you want to target with your application. The client authenticates directly with its client ID and secret (Base64-encoded as `clientId:clientSecret`) to obtain an access token.

**Scopes:**

All OAuth 2.0 clients and access tokens have a scope. The scope restricts the endpoints to which a client has access, and whether a client has read or write access to an endpoint.

Scopes are organized by API area:

- **Core API:** `reservations.read`, `reservations.manage`, `reservations.force-manage`, `availability.read`, `availability.manage`, `offers.read`, `offer-index.read`, `rates.read`, `rates.manage`, `rateplans.read-corporate`, `setup.read`, `setup.manage`, `folios.read`, `folios.manage`, `invoices.read`, `invoices.manage`, `companies.read`, `companies.manage`, `reports.read`, `logs.read`, `account.manage`, `accounting.read`, `maintenances.read`, `maintenances.manage`, `operations.trigger-night-audit`, `operations.change-room-state`, `authorizations.read`, `authorizations.manage`, `payment-accounts.read`, `payment-accounts.manage`
- **Distribution API:** `distribution:subscriptions.manage`, `distribution:reservations.manage`
- **Identity API:** `identity:account-users.read`, `identity:account-users.manage`
- **Integration API:** `integration:ui-integrations.manage`
- **Rendering API:** `rendering:upload-logo`, `rendering:manage-configuration`, `rendering:render-invoice`, `rendering:read-configuration`
- **Fiscalization API:** `fiscalization:configuration.manage`
- **OpenID scopes:** `openid`, `profile`, `offline_access`

Access tokens expire after 3600 seconds (1 hour). Use refresh tokens (with `offline_access` scope) to obtain new access tokens without re-authenticating the user.

## Features

### Reservation & Booking Management

Create, read, modify, cancel, and delete reservations and bookings. Supports check-in, check-out, reverting check-ins, marking no-shows, and assigning/unassigning rooms (units) to reservations. Connects booking engines directly to the PMS to avoid delays in room availability and price updates.

### Inventory Management

Manage inventory and fully automate the rollout of new properties. Create and manage properties, units (rooms), unit groups (room types), and unit attributes. Change room states (e.g., clean, dirty, inspected) and manage maintenance windows for units.

### Rate & Availability Management

Set up and update rates and policies in real-time. Manage rate plans, set rates and restrictions, and read availability information. Supports corporate rate plans. Query offers for specific date ranges and guest configurations.

### Folio & Finance Management

Manage guest folios including posting charges, payments, refunds, and allowances. Move charges and payments between folios. Create and manage deposit items. The Booking API and Finance API combine to let POS apps post charges to guest or external folios. Read accounting transaction data for finance/ERP integrations.

### Invoice Management

Create, cancel, and retrieve invoices. Mark invoices as paid or written off. Render invoices as PDFs. Configure invoice settings and upload logos. Supports fiscal invoice signing and rendering for applicable jurisdictions.

### Payment Processing (Apaleo Pay)

Accept payments via various methods including terminals and pay-by-link. Manage payment authorizations (create, cancel, refresh, expire). Handle payment accounts on reservations and bookings. Track full payment transaction lifecycles including settlements, refunds, disputes, and chargebacks.

### Company Management

Create, update, and delete company profiles that can be linked to reservations for corporate bookings.

### Group & Block Management

Manage group bookings and room blocks. Blocks can be created, confirmed, released, washed, or cancelled. Reservations can be picked up from blocks.

### Distribution (Channel Management)

Subscribe to ARI (Availability, Rates, Inventory) change notifications to keep external channels synchronized. Create and modify bookings from distribution channels.

### Guest Profiles

Build up guest profiles and deduplicate them.

### Property Settings & Configuration

Configure property setup including services, city taxes, and other settings. Manage account-level and property-level configurations.

### Night Audit

Trigger and monitor night audit operations for properties.

### User Management

Read and manage account users through the Identity API.

### UI Integration

Build custom UI that extends the functionality of the Apaleo Open PMS via iFrame-based integrations within the Apaleo One interface.

### Reports

Retrieve report data for analytics and business intelligence purposes.

## Events

Apaleo webhooks allow you to subscribe to certain events. Any change that happens to the property is captured as an event, including changes relating to reservations, units, folios, invoices, system, and more.

Subscriptions are created via the Webhook API at `https://webhook.apaleo.com/v1/subscriptions`. You can subscribe to all events of a topic using the `{topic}/*` wildcard pattern, or subscribe to specific events. If you create the subscription without specifying a list of properties, the subscription automatically works for all current and future properties of the account.

### Account Events

Notifies when an account goes live or is suspended. These are account-level events and require no property filter.

### Property Events

Notifies when a property is created, changed, set to live, archived, or deleted. Property creation is an account-level event.

### Reservation Events

Notifies on reservation lifecycle changes: created, amended (stay details changed), changed (non-stay details), checked-in, checked-out, check-in reverted, set to no-show, canceled, deleted. Also covers unit assignment/unassignment, payment account changes, and block pick-ups.

### Booking Events

Notifies when a booking (which can contain multiple reservations) is created, changed, deleted, or when a payment account is set. These are account-level events.

### Company Events

Notifies when a company is created, changed, or deleted.

### Group Events

Notifies when a group is created, changed, or deleted.

### Block Events

Notifies on block lifecycle changes: created, changed, deleted, confirmed, released, washed, or cancelled.

### Unit Events

Notifies when a unit (room) is created, changed, or deleted.

### Unit Group Events

Notifies when a unit group (room type) is created, changed, or deleted.

### Unit Attribute Definition Events

Notifies when a unit attribute definition is created, changed, or deleted.

### Folio Events

Extensive folio-related notifications including: creation, closure, reopening, deletion, balance changes, charge/payment/refund/allowance posting, deposit item lifecycle, and movement of charges/payments/refunds/allowances between folios.

### Invoice Events

Notifies when an invoice is created, canceled, paid, written off, signed (fiscal), or rendered (fiscal).

### Rate Plan Events

Notifies when a rate plan is created, changed, or deleted.

### Night Audit Events

Notifies when night audit starts, succeeds, or fails.

### Maintenance Events

Notifies when a maintenance slot is created, changed, or deleted.

### City Tax Events

Notifies when a city tax is created, changed, or deleted.

### Service Events

Notifies when a service is created, changed, or deleted.

### Payment Transaction Events (Apaleo Pay only)

Extensive payment transaction lifecycle notifications including: authorized, refused, authorization-adjusted, cancelled, settlements, refunds, disputes (opened, information requested/supplied, won, lost), fraud detection, chargebacks, and merchant account events.
