Let me find the specific webhook event types that SavvyCal supports.# Slates Specification for SavvyCal

## Overview

SavvyCal is a scheduling platform that allows users to create shareable scheduling links for booking meetings. It supports features like calendar overlay for recipients, team scheduling, meeting polls, automated workflows, and paid events.

## Authentication

SavvyCal supports two authentication methods:

### Personal Access Tokens

Personal access tokens are intended for testing and controlling your own account via the API. They are managed via the SavvyCal interface under Developer Settings by clicking "Create a token."

Tokens are prefixed with `pt_secret_` and are passed via the `Authorization` header using the `Bearer` scheme:

```
Authorization: Bearer pt_secret_XXXXXXXXXXX
```

**Base URL:** `https://api.savvycal.com`

### OAuth 2.0

OAuth is used for building integrations where you are operating on behalf of another user.

To register an OAuth app, you must reach out to SavvyCal support.

**Authorization URL:** `https://savvycal.com/oauth/authorize`
**Token URL:** `https://savvycal.com/oauth/token`

The authorization flow begins by redirecting the user to `https://savvycal.com/oauth/authorize?response_type=code&client_id=<your-client-id>&redirect_uri=<your-redirect-uri>`. The auth code returned in the redirect query string is then exchanged for an access token via a POST request to `https://savvycal.com/oauth/token` with `code`, `client_id`, `client_secret`, `grant_type=authorization_code`, and `redirect_uri` as form-encoded body parameters.

Access tokens are short-lived (2 hours) and can be refreshed using the long-lived refresh token issued during the authorization flow. Refresh tokens are exchanged at the same token endpoint with `grant_type=refresh_token`.

Authenticated requests include the access token in the `Authorization` header with the `Bearer` prefix against `https://api.savvycal.com`.

## Features

### Event Management

You can list, fetch, create, and cancel events scheduled via SavvyCal. Events can be created programmatically for a given scheduling link, but only for time slots that match the link's available slots. Events include details such as attendees, conferencing info, start/end times, state, and custom metadata.

- Event states include: `confirmed`, `canceled`, `awaiting_reschedule`, `awaiting_checkout`, `checkout_expired`, `awaiting_approval`, `declined`, and `tentative`.
- Custom metadata can be stored on events via query string parameters on scheduling links (e.g., `metadata[key]=value`) and retrieved via the API or webhooks.
- For some conferencing providers (like Zoom), meeting information may not appear immediately in the response and will be attached later via a retry.

### Scheduling Links

A scheduling link represents a URL that can be used to schedule meetings. You can list existing scheduling links and create new ones in the personal scope of the current user.

- Links include configurable properties such as default duration, available durations, time slot increment, custom fields, public/private names, URL slug, and state (`active`, `pending`, `disabled`).
- Custom fields can be attached to links to collect information from schedulers (e.g., short text questions).

### Users

You can retrieve information about the currently authenticated user via the API.

### Workflows

Workflows allow you to attach automated actions to scheduling links, such as creating CRM records, sending reminders, or creating to-dos in project management tools. Workflows support multiple actions and can be reused across multiple links. The API provides endpoints for managing workflows, workflow actions, and workflow rules.

### Time Zones

The API provides a list of supported time zones.

### Webhook Management

You can create, read, and delete webhooks via the API. When creating a webhook, you specify the URL to receive HTTP POST requests.

## Events

SavvyCal supports webhooks that deliver real-time HTTP POST notifications when changes occur. Webhooks are sent over HTTPS and signed with a per-webhook secret key using SHA-256 HMAC, included in the `x-savvycal-signature` header. Webhooks can be registered via the UI or the REST API.

### Event Lifecycle

- **event.created** — Emitted when someone schedules a new event via a scheduling link, or when approval is granted on an event that requires approval.
- **event.requested** — Emitted when someone schedules an event that requires organizer approval.
- **event.approved** — Emitted when an organizer approves a pending event.
- **event.declined** — Emitted when an organizer declines a pending event.
- **event.rescheduled** — Emitted when an existing event is rescheduled.
- **event.changed** — Emitted when an event is updated, with details about the change.
- **event.canceled** — Emitted when an existing event is canceled.

### Event Checkout (Paid Events)

- **event.checkout.pending** — Emitted when someone books a paid event but checkout is still pending.
- **event.checkout.expired** — Emitted when checkout for a paid event expires without payment.
- **event.checkout.completed** — Emitted after successful checkout on a paid event.

### Event Attendees

- **event.attendee.added** — Emitted when a new attendee is added to an existing event (as a guest or group event participant).
- **event.attendee.canceled** — Emitted when an individual cancels from a group event.
- **event.attendee.rescheduled** — Emitted when an individual reschedules their response to a group event.

### Meeting Polls

- **poll.response.created** — Emitted when someone creates a response to a meeting poll.
- **poll.response.updated** — Emitted when someone updates their response to a meeting poll.

### Workflows

- **workflow.action.triggered** — Emitted when an action is triggered in a workflow.
