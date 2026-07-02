# Slates Specification for Sympla

## Overview

Sympla is a Brazilian event management and ticketing platform that allows organizers to create, promote, sell tickets, and manage participants for both in-person and online events. The Sympla API is the public interface for accessing data on the Sympla platform, providing information related to events created by the user, including tickets, orders, and participants.

## Authentication

Sympla uses **API key (token) authentication**. Sympla uses API keys for authentication.

The token must be included in all requests sent to the API. To generate an access key, log in to the Sympla platform, go to the "My Account" menu (accessible from your username), and navigate to the "Integrations" tab. Provide a name for identification and click "Create access key." You can generate more than one token for your events if desired.

The token is passed as a header in each API request:

- **Header name:** `s_token`
- **Header value:** Your generated API token

The base URL is `https://api.sympla.com.br/public/v3`.

The API provides access to event information created on the Sympla platform, exclusively those linked to the user who owns the token.

## Features

### Event Management (Read-Only)

The API provides access to events created on the Sympla platform linked to the token owner. It allows customization of results, such as filtering events within a date range or restricting which fields are returned (e.g., only event name and description).

- Filter events by date windows.
- Select specific fields to include in the response.
- Retrieve details for a specific event by its identifier.
- The API is read-only; event creation or modification is not supported via the API.

### Order Management

Retrieve orders (ticket purchases) associated with your events. You can list all orders for a given event or retrieve a specific order by its identifier.

- List all orders for a specific event.
- Get details of an individual order by order ID.

### Participant Management

Access participant (attendee) information for your events. You can retrieve participants associated with a specific order, or list all participants for a given event. You can also look up an individual participant by their ticket ID.

- List participants by event.
- List participants by order.
- Get a specific participant by ticket ID.
- Participant data includes check-in status.

### Affiliate Management

The API provides access to affiliate information for a given event.

- Retrieve affiliates associated with a specific event.

## Events

The Sympla API does not natively support webhooks or event subscription mechanisms. The API is read-only and designed for polling data about events, orders, and participants. Third-party integration platforms (such as Zapier and Pipedream) implement polling-based triggers on top of the API to detect changes such as new attendees, new orders, and new events, but these are not purpose-built event mechanisms provided by Sympla itself.

The provider does not support events.
