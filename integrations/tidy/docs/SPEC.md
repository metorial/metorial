There are multiple "Tidy" products. Given the context mentions "Tidy" as an integration platform provider, the most likely candidate is **TIDY** (tidy.com) - the property management/cleaning services platform. Let me get more details on their API.Now let me get more details on the API reference to understand the full feature set.Now I have all the information I need to write the specification.

# Slates Specification for Tidy

## Overview

TIDY is a property management platform that connects property owners and managers with cleaning and maintenance service professionals. It provides tools for booking and managing cleaning/maintenance jobs, managing properties (addresses), handling guest reservations, tracking to-do lists, and managing service provider relationships.

## Authentication

TIDY uses **API Key** authentication via Bearer tokens.

- **Type:** Bearer Token (API Key)
- **Header:** `Authorization: Bearer <your_api_key>`
- **Base URL:** `https://api.tidy.com/api/v1/`

To obtain an API key:

1. Log into your TIDY account.
2. Navigate to the "Developers" section.
3. Go to the "API Keys" section and generate a new API key.

All requests must be made over HTTPS. Requests over plain HTTP or without authentication will fail.

## Features

### Address (Property) Management

Manage the physical properties/locations where services are requested. Create, update, retrieve, list, and delete addresses associated with your account. Addresses are the foundational entity to which jobs, pros, and to-do lists are linked.

### Job Management

Request, schedule, and manage cleaning or maintenance jobs at your properties. You can create jobs by specifying the address, service type (e.g., `regular_cleaning.one_hour`), and a preferred time window. Jobs can be updated, cancelled, rescheduled, and retrieved. Jobs can have assigned pros (who performs the work) and to-do lists (what to do on the job).

- Key parameters include `address_id`, `service_type_key`, `start_no_earlier_than`, and `end_no_later_than`.

### Pro (Service Provider) Management

Add and manage service professionals who perform jobs. Pros are linked to your account and can be assigned to specific jobs at your properties.

### Booking Availability

Query available time slots for booking jobs. This allows checking pro availability before scheduling.

### To-Do Lists

Manage to-do lists that define the specific tasks to be completed during a job. To-do lists can be retrieved and associated with addresses and jobs.

### Guest Reservations

Manage guest reservations for your properties. Create, retrieve, list, and delete guest reservations linked to addresses. This is useful for short-term rental scenarios where cleaning is coordinated around guest check-in/check-out schedules.

### Issue Tracking

Report, track, and resolve property issues. Create issues, retrieve them, list all issues, delete them, or mark them as resolved.

## Events

TIDY supports webhooks that send event notifications to your application via HTTP POST requests when certain actions occur. Webhook endpoints are configured in the "Developers" section of the TIDY dashboard.

If a webhook delivery fails, TIDY retries up to 10 times with increasing intervals between attempts, from a few seconds up to approximately one week.

### Booking Updates

Notifications related to the lifecycle of a booking/job. The following event types are supported:

- **Booking Scheduled** — A booking has been scheduled.
- **Booking In Progress** — A booking is currently being performed.
- **Booking Completed** — A booking has been completed.
- **Booking Cancelled** — A booking has been cancelled.
- **Booking Failed** — A booking has failed.

Each webhook payload includes the event type, a UUID, and the booking data (including current attributes and previous attributes for change tracking).
