Now let me get the full list of API resources available:Now I have enough information to write the specification.

# Slates Specification for Scheduleonce

## Overview

ScheduleOnce (now part of OnceHub) is an online scheduling platform that allows businesses to automate appointment booking with prospects and customers. It provides booking calendars, booking pages, event types, team scheduling, and integrates with major calendar services and video conferencing tools. The platform exposes a REST API and webhooks for programmatic access to booking data and scheduling configuration.

## Authentication

ScheduleOnce uses API Key authentication. Every request must include the API key in the `API-Key` HTTP header, and all communication must occur over HTTPS.

**Obtaining an API Key:**

1. Log in to your OnceHub account, click the gear icon in the top right corner and select Account Integrations, then select the APIs & Webhooks tile. Your key is displayed at the top of the page.

**Using the API Key:**

Include the key in the `API-Key` header of every request:

```
GET /v2/bookings HTTP/1.1
Host: api.oncehub.com
API-Key: your-api-key-here
Content-Type: application/json
```

The API key is automatically generated the first time you access the API Integrations section. It remains valid until you regenerate it or delete your account. You can regenerate the key at any time if it is compromised.

There are no OAuth flows or scopes. The API key grants full access to the account's data.

## Features

### Booking Management

Retrieve booking details including meeting times, guest details, and locations. Access a list of all bookings with filtering capabilities. You can request booking data that meets specific parameters and gather actionable data, including scheduling advanced reports and collecting contact information to keep your database or CRM up-to-date.

- Filter bookings by starting time range, last updated time, status, and other parameters.
- Booking data includes subject, duration, status, start time, location, virtual conferencing details, form submissions (name, email, phone, company, custom fields), and cancel/reschedule information.
- Bookings can have statuses: requested, scheduled, rescheduled, completed, canceled, no_show.

### Booking Calendars

Manage Booking Calendars, which are the scheduling resources that define how meetings are offered to customers. Booking Calendars offer flexible meeting types including single-host, multi-host, and multi-guest setups for various scheduling needs.

- Retrieve and manage Booking Calendar configurations.

### Booking Pages (Classic)

Access and manage data related to Booking Pages, which are the classic scheduling interface.

- Retrieve Booking Page details, Master Pages, and Event Types associated with them.
- This is the legacy interface; Booking Calendars are the newer equivalent.

### Users and Teams

The API provides access to users and teams as scheduling resources. Retrieve user and team information for your account, which is useful for understanding booking ownership and assignment.

### Event Types

The API provides access to Event Types, which represent different services or meeting types offered. Event types represent the different services you offer, each with configurable duration and pricing.

### Webhook Management

Webhook subscriptions can be created, deleted, and retrieved via the webhooks API. Subscriptions are configured with a POST URL and an array of user-specified event triggers. Multiple webhook subscriptions can be associated with the same account.

- Each webhook subscription includes a secret for signature verification.

## Events

ScheduleOnce supports webhooks for real-time event-driven notifications. Webhook subscriptions are configured with a POST URL and an array of user-specified event triggers representing different booking lifecycle events. Multiple webhook subscriptions can be associated with the same OnceHub account.

### Booking Events

The following specific booking event triggers are available: `booking.scheduled`, `booking.rescheduled`, `booking.canceled_then_rescheduled`, `booking.canceled_reschedule_requested`, `booking.canceled`, `booking.completed`, `booking.no_show`.

- **`booking.scheduled`**: Triggered when a booking is scheduled by a customer.
- **`booking.rescheduled`**: Triggered when a customer reschedules a booking with the same user.
- **`booking.canceled_then_rescheduled`**: Triggered when a customer cancels a booking with one user and reschedules with a different user.
- **`booking.canceled_reschedule_requested`**: Triggered when a user requests to reschedule a booking.
- **`booking.canceled`**: Triggered when a booking is canceled by either the customer or the user.
- **`booking.completed`**: Triggered once the scheduled meeting end time has passed.
- **`booking.no_show`**: Triggered if the user sets the status of the completed meeting to No-show.
- **`booking`** (composite): Subscribing to this trigger will send notifications for all of the booking scenarios described above.

### Conversation Events

Webhooks for conversation events will contain the conversation object in the data payload. These cover lifecycle events from OnceHub's chatbot (ChatOnce) interactions.
