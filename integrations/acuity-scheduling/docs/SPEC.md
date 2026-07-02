Now I have a comprehensive picture. Let me also check the webhook event types more completely.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Acuity Scheduling

## Overview

Acuity Scheduling is an online appointment scheduling platform (owned by Squarespace) that allows businesses to manage bookings, availability, client intake, and payments. Clients can self-book appointments, pay online, and complete intake forms. The API provides programmatic access to scheduling, client management, and storefront features.

## Authentication

Acuity Scheduling supports two authentication methods:

### 1. HTTP Basic Authentication

Authentication is done over SSL with HTTP Basic Auth, using the numeric User ID as the username and the API Key as the password. Credentials can be found in the Acuity account under Business Settings > Integrations > API > View Credentials, where you can copy the User ID and API Key.

Basic authentication is recommended only for single-account integrations. If you just need to authenticate with one account, use basic authentication.

- **Base URL:** `https://acuityscheduling.com/api/v1/`
- **Username:** Your numeric User ID
- **Password:** Your API Key

### 2. OAuth2 (Authorization Code Flow)

OAuth2 is recommended for applications where many different Acuity users need to authenticate. A user clicks a connect button in the client application and is redirected to Acuity to enter their credentials. After authorizing the app, the user is redirected back with an authorization code which is exchanged for an API access token.

- You need to register an Acuity OAuth2 client account to get started.
- **Authorization URL:** `https://acuityscheduling.com/oauth2/authorize`
- **Token URL:** `https://acuityscheduling.com/oauth2/token`
- **Required parameters:** `client_id`, `client_secret`, `redirect_uri`
- **Scope:** `api-v1`
- Once obtained, set the Authorization header to `Bearer ACCESS_TOKEN` to authenticate requests.
- Access tokens do not expire and do not require refresh.

## Features

### Appointment Management

The API allows managing most aspects of scheduling, including creating and modifying appointments. You can create, retrieve, update, cancel, and reschedule appointments. Each appointment is associated with an appointment type, calendar, and client details. Custom intake form field values can be submitted when creating appointments.

- Appointments include client name, email, date/time, appointment type, calendar, and custom form fields.
- Appointments can be filtered by date range, calendar, appointment type, and other criteria.
- Payment information for an appointment can be retrieved.

### Availability Management

The API lets you fetch detailed information about schedules, available time slots, and calendar events. You can query available dates for a given month and appointment type, retrieve specific available time slots, check class availability, and validate proposed appointment times.

- Availability is queried per appointment type, calendar, and date range.
- Supports both one-on-one appointments and group classes/workshops.

### Time Blocking

You can block a specific time slot on a schedule to prevent scheduling of appointments during that time range. Blocks can be created, listed, retrieved individually, and deleted.

- Each block is associated with a specific calendar.

### Calendar Management

Calendars represent individual staff members or locations. The API allows listing all calendars associated with the account.

### Client Management

The API provides endpoints for managing clients. You can create, retrieve, update, and delete client records. Clients store contact information and can be associated with appointments.

### Appointment Types and Add-ons

You can retrieve the list of configured appointment types (service offerings) and appointment add-ons. These define the services available for booking, including their duration, pricing, and associated calendars.

### Intake Forms

The API allows retrieval of intake form definitions configured for the account. Forms are associated with appointment types and collect custom information from clients during booking.

### Certificates and Coupons

You can manage gift certificates, packages, and coupons. The API supports creating and deleting certificates, as well as validating certificate/coupon codes at checkout.

### Products and Packages

The API provides access to the online store, including listing products and packages, and retrieving orders for packages, gift certificates, and subscriptions.

### Labels

Labels can be retrieved and are used for categorizing and organizing appointments.

### Account Information

Basic account information can be retrieved via the `/me` endpoint, providing details about the authenticated user's account.

## Events

Webhooks notify a URL when an appointment is scheduled, canceled, or rescheduled. Acuity can also send webhooks when packages/gift certificates/subscription orders are completed.

Webhooks can be created statically in the Acuity account settings, or dynamically using the API. A maximum of 25 webhooks can be created per Acuity account.

Webhook payloads include the action type, the resource ID (appointment or order), and for appointments, the calendar ID and appointment type ID.

### Appointment Events

- **`appointment.scheduled`** — Fired once when an appointment is initially booked.
- **`appointment.rescheduled`** — Fired when an appointment is rescheduled to a new time.
- **`appointment.canceled`** — Fired when an appointment is canceled.
- **`appointment.changed`** — A catch-all event fired when the appointment is changed in any way, including when it is initially scheduled, rescheduled, or canceled, as well as when appointment details such as email address or intake forms are updated. Using the `changed` webhook concurrently with the `scheduled`, `rescheduled`, or `canceled` webhooks may lead to duplicate requests.

### Order Events

- **`order.completed`** — Fired when a package, gift certificate, or subscription order is completed.
