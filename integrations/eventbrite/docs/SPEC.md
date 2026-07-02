Let me fetch the actual Eventbrite documentation pages for authentication, webhooks, and API details since the search results showed mostly generic descriptions.The Eventbrite docs seem to require JavaScript rendering. Let me search for more specific details.Let me get the full list of webhook actions from the Eventbrite API docs.Now I have enough information to write the specification.

# Slates Specification for Eventbrite

## Overview

Eventbrite is a U.S.-based event management and ticketing website. The service allows users to browse, create, and promote local events. With its API, developers can integrate Eventbrite's functionalities into their applications, enabling automated event management and data retrieval.

## Authentication

The Eventbrite API uses OAuth 2.0 for authentication. There are two approaches:

### Personal OAuth Token (Private Token)

For single-user integrations, Eventbrite provides a streamlined workflow. Visit your apps page, and make sure you have at least one app created. Every app you own will have a "Your OAuth Token" entry; click Show to reveal a premade OAuth token for your account. This token can be passed as a Bearer token in the `Authorization` header or as a `token` query parameter.

### OAuth 2.0 Authorization Code Flow

If you're using the API for many Eventbrite users, follow the OAuth Token Flow.

1. **Create an app**: Navigate to the "My Apps" section in the Eventbrite Developer Portal. Click on "Create a New App". Provide an App Name, App Description, and OAuth Redirect URI.
2. **Credentials**: Once your app is created, you'll receive a Client ID and Client Secret. Keep these credentials secure, as they are essential for authenticating API requests.
3. **Authorization URL**: Direct users to `https://www.eventbrite.com/oauth/authorize` with parameters:
   - `response_type=code`
   - `client_id=YOUR_CLIENT_ID`
   - `redirect_uri=YOUR_REDIRECT_URI`
4. **Token exchange**: After users authorize your app, they will be redirected to your specified redirect URI with an authorization code. Exchange this authorization code for an access token by making a POST request to the Eventbrite token endpoint (`https://www.eventbrite.com/oauth/token`), including your Client ID, Client Secret, and authorization code.

All API requests use the access token via the `Authorization: Bearer <token>` header against the base URL `https://www.eventbriteapi.com/v3/`.

Eventbrite does not define specific OAuth scopes; the token grants access based on the authenticated user's permissions.

## Features

### Event Management

Create, retrieve, update, publish, and unpublish events within an organization. Events can be retrieved by event ID, listed by venue, or listed by organization. Event details include name, description, start/end times, capacity, status, and structured content. There is no public API endpoint for searching events across the entire Eventbrite platform. The search functionality seen on the Eventbrite website is an internal feature not available through the public API.

### Ticket Management

Create and manage ticket classes and orders. Ticket classes define ticket types for an event (e.g., pricing tiers, quantities, descriptions). Orders represent completed ticket purchases and can be listed by event or organization.

### Attendee Management

Track registrations and check-ins. Retrieve attendee lists for specific events, look up individual attendee details, and access attendee information through associated orders.

### Venue Management

Access venue details and capacity. Create and retrieve venue information including address and location data. Events can be filtered by venue.

### Organizer Management

Create and manage organizer profiles associated with events. Organizer properties include description, logo, URL, name, and counts of past/future events.

### Discount Management

Create, update, delete, and search for discount codes associated with events.

### User Information

Retrieve details about the authenticated user, their owned events, and associated organizations. The `/users/me/` endpoint provides the current user's profile information.

### Structured Content

Create and update structured content (text and media) for event description pages, providing richer formatting beyond basic HTML descriptions.

## Events

Eventbrite supports webhooks that deliver real-time notifications via HTTP POST with a JSON payload. Webhooks can be created/deleted in the admin web interface or by using the API. Each webhook is configured with a payload URL and one or more action types. Webhooks can be scoped to all events or a specific event within the organization.

### Event Lifecycle

Notifications for changes to events on the platform:

- **Event Created** (`event.created`): Triggered when an event is created in your Eventbrite account.
- **Event Updated** (`event.updated`): Triggered when an event is updated in your Eventbrite account.
- **Event Published** (`event.published`): Triggered when an event is published in your Eventbrite account.
- **Event Unpublished** (`event.unpublished`): Triggered when an event is unpublished in your Eventbrite account.

### Orders

Notifications related to ticket orders:

- **Order Placed** (`order.placed`): Triggered when a new order is placed for tickets to an event.
- **Order Updated** (`order.updated`): Triggered when an order is updated.

### Attendees

Notifications related to attendee activity:

- **Attendee Updated** (`attendee.updated`): Triggered when an attendee updates.
- **Attendee Checked In** (`barcode.checked_in`): Triggered when an attendee's barcode is scanned in.
- **Attendee Checked Out** (`barcode.un_checked_in`): Triggered when an attendee's barcode is scanned out.
