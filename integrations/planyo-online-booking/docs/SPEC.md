Now let me get the webhook event details from the Planyo FAQ:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Planyo Online Booking

## Overview

Planyo is an online reservation system used by businesses that take bookings for resources such as vacation properties, car rentals, hotels, equipment, event spaces, and professional services. It supports time-based bookings (days, nights, hours, minutes, or scheduled events), with features for availability management, pricing, payments, and customer management.

## Authentication

Planyo uses **API Key** authentication. All API calls must include an `api_key` parameter.

- **Obtaining the API key**: Log in to your Planyo account and navigate to the "API - Planyo Web Services" configuration page at `https://www.planyo.com/api.php`, then click the "API Key" button to generate your key.
- **Endpoint**: All requests are made to `https://www.planyo.com/rest/` as GET or POST requests, with `method` and `api_key` as required parameters.
  - Example: `https://www.planyo.com/rest/?method=get_site_info&api_key=YOUR_API_KEY`
- **IP Restriction** (optional): API keys can be restricted to only allow calls from specified IP addresses and/or to specific methods.
- **Hash Key** (optional, recommended): For additional security, a hash key can be enabled. When enabled, all calls must include:
  - `hash_timestamp`: The current UTC timestamp (seconds since Unix Epoch).
  - `hash_key`: An MD5 hash of the concatenation of the secret hash key + `hash_timestamp` + `method` name (no separator).

The API key must be kept secret and should never be used in client-side code.

## Features

### Reservation Management

Create, modify, cancel, delete, and query reservations. Check if a reservation can be made based on availability and constraints (start/end weekday rules, buffer time between rentals, etc.). Search reservations by customer details, reservation ID, or custom form item values. Perform administrative actions like confirmation or cancellation.

- Reservations can be grouped into **shopping carts** for multi-resource bookings.
- Custom reservation form items (defined per resource or globally) are supported.
- Reservation colors and notes (user and admin) can be set.

### Resource Management

Create, modify, and remove bookable resources. Resources can be regular (continuous availability) or event-type (fixed scheduled times). Resources support packages (bundles of other resources), custom properties, images, unit names, and form item definitions.

- Resources can be duplicated from a template resource when creating new ones.
- Resource administrators and moderators can be assigned.
- Custom property definitions can be added to make properties searchable or filterable.

### Availability & Scheduling

Query resource availability for specific time periods, get usage information by month, and search for available resources. Manage vacations (periods of unavailability) — both one-time and recurring — at the resource or site level. Configure weekly schedules (working/unavailable hours).

- iCal feed URLs can be generated for syncing with external calendars.
- Event-type resources have specific event time management.

### Pricing

Configure pricing through Pricing Manager rules, including daily pricing, seasonal pricing, and custom rules. Calculate rental prices for given time periods and resource parameters. Set custom prices on individual reservations and recalculate prices when rules change.

- Simplified daily pricing export is available for channel manager integration (accommodations).
- Daily restrictions can also be exported for channel managers.

### Payments

Record payments against reservations, list payments with filters, modify payment statuses, and remove payments. Query outstanding amounts. Credit card numbers cannot be passed through the API.

- Payment gateways can be configured per site via the API.

### User Management

Create, modify, search, and remove users (customers). Assign roles such as agents, moderators, and resource administrators. Query user data and manage custom user properties.

- Users can be searched by custom property values.

### Additional Products

Define and manage add-on products that can be attached to reservations (e.g., airport transfer, insurance). Manage product images, set product usage per reservation, and create one-off custom products.

### Coupons & Vouchers

Create and manage coupon types, generate individual coupons, and apply them to reservations. Create vouchers with various restrictions (site-wide, resource-specific, date-limited). List and modify both coupons and vouchers.

### Seasons

Define seasonal settings for resources or entire sites, controlling time-based rules like minimum stay, pricing adjustments, and availability constraints.

### Site & Meta Site Management

Manage site-level settings, images, and properties. For meta sites (multi-site setups), create new child sites, list sites, and manage site-level moderators. Configure payment gateways.

### Invoices

Generate invoices for reservations, list invoice items (including additional and custom products), and retrieve invoices by reservation or date range. Uses a parent & corrective invoice model.

### Notifications & Messaging

Send emails to customers with messages recorded in reservation history. Add or remove webhook callbacks for specific events. Requires a custom SMTP server for the email sending function.

### Templates & Translations

Process notification templates with dynamic tags based on reservation/resource context. Manage custom translations for sites and meta sites.

## Events

Planyo supports **webhooks** (notification callbacks) that can be configured per event. Each event type can have one or more callback URLs, and Planyo sends reservation and event data as POST parameters (or JSON if configured) to the registered URL.

Webhooks are managed via the API (`add_notification_callback` / `remove_notification_callback`) or through the Planyo backend under Site Settings > Notifications > Notification Callbacks.

### Reservation Lifecycle Events

- **New reservation**: Triggered when a new reservation with a verified email is entered.
- **Reservation confirmed**: Triggered when an admin confirms a reservation (includes confirmation method: payment, coupon, or manual).
- **Reservation cancelled by admin**: Triggered when an admin cancels a reservation.
- **Reservation cancelled by customer**: Triggered when a customer cancels their own reservation.
- **Reservation auto-cancelled**: Triggered when a reservation is automatically cancelled based on configured cancellation rules.
- **Reservation modified by admin**: Triggered when an admin modifies a reservation.
- **Reservation modified by customer**: Triggered when a customer modifies their own reservation.
- **Reservation removed**: Triggered when a reservation is permanently deleted.
- **Confirmed status cleared**: Triggered when the confirmed status is removed from a reservation.
- **Additional products modified by customer**: Triggered when a customer changes the additional products on a reservation.
- **Price updated**: Triggered when a reservation's price changes.

### Check-in/Check-out Events

- **Checked in**: Triggered when a reservation status changes to checked-in.
- **Checked out**: Triggered when a reservation status changes to checked-out.
- **No-show**: Triggered when a reservation status changes to no-show.

### Payment Events

- **Reservation payment received**: Triggered when an online payment is received for a reservation. Includes payment amount, mode, and time.
- **Reservation payment removed**: Triggered when a payment is removed by an admin.
- **Coupon payment received**: Triggered when an online payment for a coupon purchase is received.
- **Coupon payment removed**: Triggered when a coupon payment is removed by an admin.

### Scheduling Events

- **Vacation modified**: Triggered when a vacation (unavailability period) is added, removed, or modified via the admin panel. Includes vacation type (one-time, recurring) and time details.

### Timed Events

- **Before/after events (#1–#6)**: Up to six configurable time-relative triggers that fire a given number of hours/days before or after the reservation start, end, or creation time. Configured in the Notifications section of the Planyo backend.

### Other Events

- **User updated**: Triggered when a new user is added or user settings are updated. Includes a flag indicating if the user is new.
- **Resource settings changed**: Triggered when settings of a resource are modified.
- **Resource removed**: Triggered when a resource is removed.
- **Added to waitlist**: Triggered when a reservation request is added to the waiting list.
- **New price quotation**: Triggered when a new price quotation is created.
- **Hourly notification**: A periodic hourly trigger.
- **Custom button (#1–#5)**: Triggered when an admin clicks one of up to five custom buttons on the reservation details page.
