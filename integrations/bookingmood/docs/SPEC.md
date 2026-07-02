# Slates Specification for Bookingmood

## Overview

Bookingmood is a commission-free booking platform designed for vacation rental owners and property managers. It enables users to manage reservations directly on their websites, with features including availability calendars, embeddable booking widgets, payment processing via Stripe, guest communication, and iCal synchronization with platforms like Airbnb and Booking.com.

## Authentication

Bookingmood uses **API key** authentication via Bearer tokens.

- You can create and manage API keys from the bottom of the settings page of your organization in the admin dashboard.
- Once you have an API key, simply provide it in the HTTP `Authorization` header as a bearer token.

**Example:**

```
Authorization: Bearer YOUR_API_KEY
```

**Base URL:** `https://api.bookingmood.com/v1/`

There are no OAuth flows, scopes, or additional credentials required. Each API key is scoped to the organization it was created under.

## Features

### Booking Management

Create, read, update, and manage bookings and their associated details. This includes tracking booking status (e.g., confirmed, cancelled), viewing booking updates/history, and associating bookings with contacts. Bookings contain line items, taxes, subtotals, deposits, and totals.

### Calendar Event Management

Manage calendar events representing reservations, blocked periods, and other time-based entries on rental units. Events have statuses (confirmed, cancelled) and can have associated notes and tasks. External calendars (iCal) can be connected for synchronization with third-party platforms.

### Contact Management

Maintain a database of contacts (guests/customers) linked to bookings. Contacts can be created, updated, filtered, and deleted.

### Product (Rental Unit) Management

Manage products (rental units/properties) including their attributes, configurable options, services, and pricing. Products support custom attributes with selectable options, seasonal pricing via price calendar entries, and capacity configuration. Products can also have associated message templates for automated guest communication.

### Invoicing & Payments

Create and manage invoices and payments associated with bookings. Track payment statuses including creation, updates, and completion. Process refunds. Line items and taxes can be configured per booking.

### Coupons & Discounts

Create and manage discount coupons that can be scoped to specific products or services, with tracking of coupon usage.

### Guest Communication

Manage messages and message templates for guest communication. Configure reply-to addresses and message events. Templates can be associated with specific products for automated messaging flows.

### Task Management

Create and manage tasks associated with calendar events (e.g., cleaning, maintenance). Tasks support templates and assignees for repeatable workflows.

### Reviews

Collect and manage guest reviews. Reviews can be associated with products and displayed through review widgets.

### Widgets & Sites

Manage embeddable booking widgets (availability calendars, pricing widgets, review widgets) and Bookingmood-hosted websites. Widgets have analytics tracking, configurable listings, and can be embedded on external sites. Sites support pages, navigation items, and listings.

### Organization & Team Management

Manage organization settings, members, user profiles, permissions, and roles for team collaboration.

### Availability & Search

Query availability for specific products and date ranges, and search across products to find available units. This supports the booking flow by checking what is bookable before creating a reservation.

## Events

Bookingmood supports webhooks for real-time event notifications. To register a webhook endpoint, provide a publicly accessible HTTPS URL and select the type of events you want to receive. Webhook endpoints can be managed via the organization settings dashboard or the API. Bookingmood signs webhook events by including a signature in each event's `X-Signature` header for verification. Events are retried up to 3 times with one-minute intervals on failure. Event delivery order is not guaranteed, and duplicate events may occur.

### Booking Events

- `bookings.created` — A booking was created.
- `bookings.updated` — A booking was updated.

### Calendar Event Events

- `calendar_events.created` — A calendar event was created.
- `calendar_events.updated` — A calendar event was updated.
- `calendar_events.confirmed` — A calendar event was confirmed.
- `calendar_events.cancelled` — A calendar event was cancelled.

### Calendar Event Task Events

- `calendar_event_tasks.created` — A task linked to a calendar event was created.
- `calendar_event_tasks.updated` — A task linked to a calendar event was updated.
- `calendar_event_tasks.completed` — A task linked to a calendar event was completed.

### Contact Events

- `contacts.created` — A contact was created.
- `contacts.updated` — A contact was updated.

### Invoice Events

- `invoices.created` — An invoice was created.
- `invoices.updated` — An invoice was updated.

### Payment Events

- `payments.created` — A payment was created.
- `payments.updated` — A payment was updated.
- `payments.paid` — A payment was paid.

### Member Events

- `members.created` — A member was created.
- `members.updated` — A member was updated.

### Product Events

- `products.created` — A product (rental unit) was created.
- `products.updated` — A product was updated.

### Site Events

- `sites.created` — A site was created.
- `sites.updated` — A site was updated.

### Widget Events

- `widgets.created` — A widget was created.
- `widgets.updated` — A widget was updated.
