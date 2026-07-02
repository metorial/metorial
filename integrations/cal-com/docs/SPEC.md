Let me get more details on the webhook triggers and the API v2 OAuth flow.Now let me get more detail on the OAuth flow and available API features/resources.Now let me check the OAuth documentation page for more details on the OAuth2 flow.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Cal.com

## Overview

Cal.com is an open-source scheduling platform that allows users to create booking pages, manage event types, and handle appointments. It provides a REST API (v2) for programmatic control over bookings, schedules, event types, teams, and organizations. Cal.com can be used as a hosted SaaS or self-hosted.

## Authentication

Cal.com supports two primary authentication methods:

### 1. OAuth 2.0 (Recommended)

OAuth is the recommended method, especially for building integrations or applications.

- **Create an OAuth client** at `https://app.cal.com/settings/developer/oauth`. The client will be in a "pending" state until reviewed and approved by Cal.com.
- **Authorization URL:** `https://app.cal.com/auth/oauth2/authorize`
  - Parameters: `client_id`, `state` (CSRF token), `redirect_uri`
  - After the user authorizes, they are redirected to `redirect_uri` with `code` and `state` as URL parameters.
- **Token exchange endpoint:** `POST https://app.cal.com/api/auth/oauth/token`
  - Body: `code`, `client_id`, `client_secret`, `grant_type` ("authorization_code"), `redirect_uri`
  - Returns `access_token` and `refresh_token`.
- **Refresh token endpoint:** `POST https://app.cal.com/api/auth/oauth/refreshToken`
  - Header: `Authorization: Bearer <refresh_token>`
  - Body: `grant_type` ("refresh_token"), `client_id`, `client_secret`
  - Returns new `access_token` and `refresh_token`.
- Access tokens are passed via the `Authorization: Bearer <access_token>` header.

### 2. API Key

- Generate an API key from **Settings > Security** in the Cal.com dashboard.
- Test keys have the prefix `cal_`, live keys have the prefix `cal_live_`.
- In API v2, pass the key via the `Authorization: Bearer <API_KEY>` header.
- In the deprecated API v1, the key was passed as a query parameter (`?apiKey=cal_live_xxxxxx`).

All API requests must be made over HTTPS.

## Features

### Booking Management

Create, retrieve, reschedule, cancel, confirm, and decline bookings. Supports marking no-shows, reassigning bookings to different hosts (auto-selected or specific), and adding guests to existing bookings. Bookings can be recurring and support seated events. Recordings and transcripts from Cal Video meetings can be retrieved per booking.

### Event Types

Create and manage event types that define what can be booked (e.g., duration, location, scheduling rules). Supports individual and team event types, including collective (all hosts must attend) and round-robin (rotating host) assignment. Event types can have private links for restricted access. Phone call event types are also supported.

### Schedules & Availability

Create and manage availability schedules that define when a user can be booked. Each user can have multiple schedules with one set as default. Schedules can be managed at the user, team member, or organization level.

### Slots

Query available time slots for a given event type based on date range. Slots can be temporarily reserved to prevent double-booking during the checkout/confirmation flow.

### Calendar Connections

Connect external calendars (Google, Outlook, Apple, ICS feeds) for conflict checking. Retrieve busy times across connected calendars. Set destination calendars where new bookings should be written.

### Conferencing

Connect conferencing apps (e.g., Zoom, Google Meet) and set a default conferencing application for the user or team. Supports OAuth-based conferencing app connections.

### Teams

Create and manage teams with memberships and roles. Teams can have their own event types, schedules, bookings, and webhooks. Supports team invite links.

### Organizations

Manage organizations that contain teams and users. Includes role-based access control with customizable roles and permissions. Supports routing forms for directing bookings to the right team members based on form responses. Organization-level out-of-office entries can be managed.

### Routing Forms

Define routing forms that collect information from bookers and route them to appropriate event types or team members. Responses can be submitted and used to calculate available slots.

### Workflows

Create automated workflows triggered by booking events for teams and organizations. Workflows can be attached to event types or routing forms. Useful for automating reminders (SMS, email) and other actions.

### Stripe Integration

Connect Stripe to accept payments for bookings. Supports both user-level and team-level Stripe connections.

### User Profile

Retrieve and update the authenticated user's profile information, including email verification for secondary emails.

### Out-of-Office

Create and manage out-of-office entries for users, specifying date ranges when the user is unavailable.

### Webhooks

Register webhook subscriptions at the user, event type, team, or organization level. Webhooks can be configured with custom payload templates and secured with a secret key for signature verification.

## Events

Cal.com supports webhooks that send real-time HTTP POST notifications to a subscriber URL when specific events occur. Webhooks can be scoped to a user, a specific event type, a team, or an entire organization.

Each webhook subscription can be configured with:

- A subscriber URL to receive payloads.
- Specific trigger events to listen to (one or more).
- An optional secret key for payload verification via HMAC SHA-256 (sent in the `X-Cal-Signature-256` header).
- An optional custom payload template using double-brace variable syntax (e.g., `{{title}}`, `{{organizer.name}}`).

### Booking Events

Triggered by lifecycle changes to bookings:

- **Booking Created** – A new booking is made.
- **Booking Rescheduled** – An existing booking is rescheduled.
- **Booking Cancelled** – A booking is cancelled.
- **Booking Requested** – A booking is requested (for event types requiring confirmation).
- **Booking Rejected** – A requested booking is rejected.
- **Booking No-Show Updated** – A booking's no-show status is manually updated.

### Payment Events

Triggered by payment activity on paid event types:

- **Booking Payment Initiated** – A payment flow is started for a booking.
- **Booking Paid** – A booking payment is completed.

### Meeting Events

Triggered by Cal Video meeting activity:

- **Meeting Started** – A Cal Video meeting begins.
- **Meeting Ended** – A Cal Video meeting ends.
- **Instant Meeting Created** – An instant (ad-hoc) meeting is created.

### Recording Events

Triggered when Cal Video recordings are processed:

- **Recording Ready** – A meeting recording is available.
- **Recording Transcription Generated** – A transcription for a recording is complete.

### No-Show Detection Events

Automatically triggered when hosts or guests fail to join a Cal Video meeting within a configured time window after the booking start time. These only apply to bookings using Cal Video.

- **After Hosts Cal Video No-Show** – The host did not join the Cal Video call within the configured time. Configurable time and time unit (e.g., 5 minutes).
- **After Guests Cal Video No-Show** – One or more guests did not join the Cal Video call within the configured time.

### Form Events

Triggered by routing form submissions:

- **Form Submitted** – A routing form is submitted (and routed to an event).
- **Form Submitted (No Event)** – A routing form is submitted but does not result in an event booking.

### Out-of-Office Events

- **OOO Created** – An out-of-office entry is created for a user.
