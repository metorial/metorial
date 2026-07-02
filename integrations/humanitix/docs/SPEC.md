Let me fetch the Swagger documentation to see the full list of endpoints.Let me check the Stoplight documentation for more details on the API endpoints.The Stoplight pages require JavaScript. Let me try fetching the help center page for more details.Now I have a good understanding of Humanitix's API. Based on the research, the API tracker site indicates no webhooks are available. Let me also note that the API appears to be primarily read-only with a beta create/update events capability. Let me compile the specification.

# Slates Specification for Humanitix

## Overview

Humanitix is a not-for-profit ticketing platform, in which all booking fees are donated to a charity of the event organiser's choice. The Humanitix Public API allows fetching event, order, ticket, or tag information. A beta API for creating and updating events is available by request to Humanitix support.

## Authentication

Humanitix uses API key authentication.

- **API Key**: You can generate and find your public API key by navigating to **account > advanced > public API key** via the top menu bar.
- **Header**: All requests require an `x-api-key` header with your API key.
- **Important**: Generating a new API key will break any existing one. Do not share your API key with anyone. Your API key allows access to sensitive data on your events and should be kept private.
- **Base URL**: `https://api.humanitix.com/v1`

Example request header:

```
x-api-key: your_api_key_here
Content-Type: application/json
```

## Features

### Event Retrieval

Retrieve details about events owned by or shared with your account. All events owned/created by your account and shared with your account can be synced through the API. Events are identified by an automatically generated event ID found in the console URL.

### Order Management

Retrieve order information associated with specific events. Orders are queried per event using the event ID. The internal order ID string is different from the buyer-facing "Order ID" visible in the orders report (e.g., "7QVD6HEL"), so ensure you use the correct internal ID from the URL.

### Ticket Retrieval

Fetch ticket information for events, allowing you to inspect individual ticket details associated with orders and events.

### Tag Management

Tags can be used to help categorise and filter your events in a collection page and widget or passed as an additional data point via an API. Tags are created on account-level and can then be applied to individual events.

- Tags are not enabled by default for an account. If you would like tags enabled for your account please contact the Humanitix support team.

### Event Creation and Updates (Beta)

Looking to create and update events in Humanitix through an API connected to your app? Contact the Humanitix support team to request that a beta version of the create and update events API be enabled for your account.

- This is not available by default and requires explicit approval from Humanitix.
- You need to share your use-case with the team in your request.

## Events

The provider does not support webhooks or event subscriptions. The API tracker listing for Humanitix shows no webhooks or webhooks management API available. The public API is read-only and does not include any built-in mechanism for receiving push notifications about changes.
