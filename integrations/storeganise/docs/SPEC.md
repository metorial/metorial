Now let me get the full webhook events list:Now let me get more info about authentication and API key creation:Now I have enough information to write the specification.

# Slates Specification for Storeganise

## Overview

Storeganise is a cloud-based management platform for self-storage, valet storage, and mobile storage businesses. It helps manage a variety of business models from one single platform including self storage, valet storage, wine storage, mobile storage and more. It helps operators automate bookings, payments, access control, and customer communication from a single, intuitive platform.

## Authentication

Storeganise supports two authentication methods:

### API Key Authentication (Admin API)

Storeganise uses API keys for authentication. API keys are generated from the Storeganise operations portal under Main Settings > Developer. You need your Storeganise API key and your account subdomain.

The API key is passed in the `Authorization` header using the `ApiKey` scheme. The base URL is tenant-specific, using the format:

```
https://{subdomain}.storeganise.com/api/v1/
```

Example request:

```
GET https://spaceup.storeganise.com/api/v1/sites
Authorization: ApiKey {your_api_key}
```

Replace `spaceup` with your business code (subdomain).

Only use API keys from server-side functions/backend scripts that use the Storeganise API. The keys should never be sent to the web browser/client/frontend.

### User Token Authentication (User API)

If you are building a customer booking flow, use the email/password combination with the User API endpoints (not Admin API endpoints). The same authentication mechanism can be used on the server side. One advantage of doing it client-side is that you can store the authentication token on the user's browser. This returns a Bearer token for subsequent requests.

**Key distinction:** The endpoints provided in the documentation are for end users; we have a separate API for admin users. The Admin API (using API keys) provides full management access, while the User API (using tokens) provides customer-facing access.

**Required credentials:**

- **Subdomain** (business code): Your Storeganise account identifier (e.g., `spaceup`)
- **API Key**: Generated from the admin portal's Developer settings

API documentation is available at `https://{subdomain}.storeganise.com/api/docs/`.

## Features

### Site Management

Manage one or multiple storage facility locations. Retrieve site details including address, operating hours, and availability status. Manage multiple locations, compartments, move-ins and move-outs, and get an instant overview of each location's occupancy with a customizable site map.

### Unit Management

Manage storage units across sites, including their availability, size, pricing, and state (available, occupied, blocked, archived). Units can be reserved, assigned to users, transferred between tenants, and unassigned.

### User/Tenant Management

Create and manage customer accounts. Fetch users with the billing include parameter, showing outstanding balances, payment history, and subscription details. Users can include related data like units, items, billing information, and custom fields via the `include` query parameter.

### Booking & Move-In/Move-Out

Manage the full lifecycle of self-storage rentals: move-in orders (initiation, confirmation, completion, cancellation), move-out scheduling and completion, and unit transfers. Supports automated workflows where orders can be auto-confirmed, auto-charged, and auto-completed.

### Valet Storage Orders

Handle valet storage operations including order submission, approval, confirmation, and completion. Manage valet storage and mobile storage solutions with delivery and barcode-based inventory tracking.

### Invoicing & Billing

Create and manage invoices, add payments, mark invoices as paid, and track invoice states (draft, sent, paid, etc.). Supports automated billing with recurring invoices and payment reminders. Integrates with various payment gateways.

### Unit Rentals

Manage ongoing rental details including pricing, state, and overdue status tracking. Supports automated rental price updates with advance notice capabilities.

### Settings & Configuration

Settings are returned as part of the GET /v1/settings request. See the items, plans, products arrays which are all returned. The settings object also includes information such as the brand name, currency, service areas, etc.

### Custom Fields

Attach and retrieve custom metadata on user accounts and other entities for business-specific data points such as referral sources, contract types, or access control groups.

### Leads & Waitlist

Track prospective customers by creating leads and managing waitlists for storage units.

## Events

Storeganise supports webhooks that can be configured in the operations portal under Main Settings > Developer > Webhooks. Webhooks are used to receive notifications when events happen within the Storeganise system. Webhooks deliver JSON payloads via POST to an HTTPS endpoint and can be verified using an HMAC-SHA256 signature via the `sg-signature` header.

### Business & Site Events

Notifications when global business settings are updated, site settings are modified, or site availability state changes.

### Self-Storage Move-In Events

Covers the full move-in lifecycle: order initiation, submission (pending approval), confirmation (invoice generated), completion, and cancellation.

### Move-Out & Transfer Events

Notifications for move-out scheduling, completion, cancellation, and unit transfer completion.

### Valet Order Events

Covers valet order lifecycle: submission, creation (pending approval), confirmation (invoice generated), completion, and cancellation.

### Unit State Events

Fires when units change state: reserved, occupied, blocked, unblocked, unassigned, or archived.

### Unit Rental Events

Notifications for rental detail updates, overdue status changes, rental invoice creation, upcoming rent change notices, and rent price update completion.

### Invoice Events

Covers invoice creation, state changes (draft, sent, paid, etc.), payment updates, and invoice deletion.

### User Events

Fires when users are created, updated, or when their billing details are modified.

### Lead Events

Triggered when a new lead is created or added to the waitlist.

### Billing Events

Notifications related to payment method listing, payment charges, and checkout flow initiation.

### Addon & System Events

Includes addon installation events, custom field validation, item updates within valet orders, invoice reminder dispatches, and a daily batch processing event (triggered at 3:00 AM).
