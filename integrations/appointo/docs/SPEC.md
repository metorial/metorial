# Slates Specification for Appointo

## Overview

Appointo is an appointment booking and scheduling application primarily designed for Shopify stores. It allows businesses to create bookable services/products, manage appointments and bookings, handle group and multi-day bookings, and integrate with calendars (Google, Outlook), video conferencing (Zoom, Google Meet), and payment processing (Stripe).

## Authentication

Appointo uses **API key** authentication. API requests are authenticated using API keys; any request that doesn't include an API key will return an error.

You can generate an API key in the Appointo app under **Plans & Settings → API access**.

The API key must be passed as a header in every request:

```
APPOINTO-TOKEN: <your-api-key>
```

The base URL for all API requests is `https://app.appointo.me/api/`.

**Note:** API access is only available on paid plans, not on free plans.

For Zapier-specific integrations, a separate **Zapier token** can be generated from the Appointo dashboard under **Settings → Generate Zapier Token**.

## Features

### Product Management

Retrieve the list of products (services) configured in Appointo. Products represent the bookable services or items offered by the business.

### Booking Management

Create, fetch, reschedule, cancel, and update bookings.

- **Fetching bookings** supports filtering by status (`past` or `upcoming`), searching by product name, customer name, email, phone, or order name.
- **Creating bookings** requires an appointment ID, timeslot, and customer details (name and email). Optionally specify quantity for group bookings.
- **Rescheduling** can target the entire booking or specific customers within a booking. An override option allows forceful rescheduling to a given timeslot.
- **Canceling** can target the entire booking or specific customers.
- **Updating** allows modifying buffer times (start and end) on a booking.
- Write operations (create, reschedule, cancel, update) are limited to 100 requests per day.

### Appointment Configuration

Manage appointment types and their availability settings.

- Retrieve appointment details, optionally filtered by product.
- **Check calendar availability** for a given appointment within a date range, with the option to filter by specific team members.
- **Update appointment configuration** including timezone, duration, interval, capacity, buffer times, reminders (email, SMS, WhatsApp), location settings, cancellation/rescheduling policies, date range restrictions, team member assignment rules, weekly availability slots with per-slot surge pricing and capacity overrides, and date-specific overrides.

### Subscription Contracts

Retrieve recurring booking subscription contracts. Supports searching by product name, variant name, order number, or customer name.

## Events

Appointo supports event triggers through its **Zapier integration** (polling-based triggers via Zapier). The following event categories are available:

### New Booking

Fires when a new booking is scheduled in Appointo. Includes booking details such as customer information, appointment type, time, and product details.

### Booking Rescheduled

Fires when an existing booking is rescheduled to a different time.

### Booking Canceled

Fires when a booking is canceled.

**Note:** These triggers are available exclusively through the Zapier integration using a dedicated Zapier token. Appointo does not appear to offer native webhook registration endpoints in its API.
