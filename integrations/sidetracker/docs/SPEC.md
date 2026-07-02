Let me fetch the API documentation to get more details.Let me try to access the Postman collection and the product features page for more detail on the API.Let me check the Zapier integration page for more details on triggers and actions.Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Sidetracker

## Overview

Sidetracker is a cookie-free marketing analytics platform that tracks website traffic, sales funnels, customer journeys, and marketing expenses. It tracks expenses, sales funnels, and customer journeys, helping optimize marketing spend and visualize campaign performance from start to finish. Specifically designed for SaaS founders, it tracks customer journeys from initial engagement on a landing domain through to sign-up and ongoing engagement.

## Authentication

Sidetracker uses API key authentication.

To obtain your API key, log into the application, navigate to the settings, and locate the API section, then copy your API key.

To authenticate requests, add the API key as a Bearer token in the header of each request.

- **Header format**: `Authorization: {API_KEY}`
- **Base URL**: `https://app.sidetracker.io/api/`

Note: The API key is passed directly as the `Authorization` header value (not with a `Bearer ` prefix).

## Features

### Lists Management

Lists are a core data structure in Sidetracker where all conversions are organized, allowing you to see the number of conversions per list at a glance. The API allows you to retrieve lists and their associated row data. Lists contain rows representing individual conversion records or tracked entries.

- Each list has a unique List ID.
- Rows within lists can be created and updated, and you can retrieve row data through the API.

### Session Tracking and Metadata

Using session IDs, you can store information back to the metadata field of a user session, such as marking `{"signup": true}` or recording any other custom value. This enables cross-domain tracking and enrichment of visitor data.

- Sessions are identified by a unique session ID.
- You can attach custom metadata to sessions via the API.

### Revenue Attribution

The API allows adding revenue data to tracked sessions. This links financial outcomes to specific visitor sessions and marketing sources.

- Requires a Session ID and an amount value.

### Sales Status Management

You can update the sales status of a customer session through the API, enabling pipeline tracking tied to the original traffic source.

- Requires a Session ID and a sales status value.

### Event Tracking via API

The REST API can help track call-to-action events. You can leverage the REST API to activate Triggers programmatically, allowing deep integration with your system based on custom logic or external events.

### Cross-Domain Tracking

By embedding parameters like `?clickEvent=keep|{session_id}` into links, Sidetracker transfers the session ID of the visitor to other domains. The API complements this by allowing you to enrich session data on the receiving domain.

## Events

Sidetracker supports webhooks for receiving real-time updates.

### Webhook Configuration

Webhooks allow you to receive real-time updates for specific events. Setup requires providing a Webhook URL and a secret token in the application settings. When an event occurs, the system sends a POST request to your Webhook URL with relevant data.

### List Row Created

Triggers instantly when a new row is added to a specific list. Requires specifying the target List ID.

### List Row Updated

Triggers instantly when an existing row in a specific list is updated. Requires specifying the target List ID.

Note: The specific event types beyond list row changes are not well-documented in publicly available API references. The webhook system is configured globally through the application settings rather than through API-based subscription management.
