# Slates Specification for IFTTT

## Overview

IFTTT (If This Then That) is an automation platform that connects over 900 services together through conditional workflows called Applets. Applets are composed of triggers, queries, and actions — triggers tell an Applet to start, queries provide additional conditions, and actions are the result of an Applet run. IFTTT provides two main APIs: the Service API (for building your own service on IFTTT) and the Connect API (for programmatically managing connections between services on behalf of users).

## Authentication

IFTTT supports two authentication approaches depending on the API being used:

### Connect API Authentication

The Connect API supports two methods:

1. **Service Key Authentication (server-to-server):** A request includes an `IFTTT-Service-Key` header containing your service key, found in the API tab of the IFTTT Platform under the Service Key heading. You can use this approach when making calls from your backend servers to the API. Most Connect API requests access user-specific resources, so the `user_id` parameter is required.

   Example: `IFTTT-Service-Key: vFRqPGZBmZjB8JPp3mBFqOdt`

2. **User Token Authentication (client-side):** A user-authenticated request includes an `Authorization` header containing a user-specific token that IFTTT has issued to your service. This approach lets you make calls from places like mobile apps or browsers where it would be inappropriate to expose your service key. A token endpoint can be used to obtain a token for a specific user: `POST /v2/user_token?user_id=123&access_token=abc` with the `IFTTT-Service-Key` header.

### Service API Authentication (OAuth2)

OAuth2 is the only authentication mechanism supported for the Service API. IFTTT's protocol supports OAuth2 authentication, including support for refresh tokens. Your service API should use access tokens for authentication and as a source of identity. A single access token should correspond to a single user account or resource owner on your service.

- If refresh tokens are used, they must be non-expiring. If refresh tokens are not used, access tokens must be non-expiring.
- When configuring your service, provide IFTTT with a client ID and client secret for authentication-related requests.

### Webhooks Service Authentication

The Webhooks service (for triggering Applets via HTTP) uses a simple API key. The key is found on the Webhooks settings page (`https://ifttt.com/maker_webhooks/settings`) and is included in the webhook URL: `https://maker.ifttt.com/trigger/{event}/with/key/{webhooks_key}`.

## Features

### Connection Management

Manage connections between your service and other IFTTT services on behalf of users. Connections allow you to set up queries, triggers, and actions for your users via the Connect API without the user having to enable anything on IFTTT. You can show connection status, enable/disable connections, and update connection configuration (e.g., trigger fields, action fields).

- Connections are identified by a `connection_id`.
- Requests fail if the user does not have the connection enabled, and the same user cannot enable the same connection twice, even across multiple IFTTT accounts.

### Triggers

Subscribe to events from any IFTTT-connected service. When a trigger detects a new event, IFTTT will send a request to your API's webhook endpoint. You can test triggers via a `/test` endpoint and configure trigger fields per user.

- For each Applet using a given trigger, IFTTT will poll that trigger's endpoint about once every hour.
- Triggers are required to use the Realtime API if a user would expect Applets to run in realtime.

### Actions

Execute actions on connected services programmatically. Actions are the output side of Applets — examples include creating calendar events, sending messages, controlling smart home devices, etc. Action fields can be pre-configured by the developer or set by the user.

### Queries

Retrieve data from connected services. A query lets your Applet retrieve extra data that isn't included in the trigger, so that your automation can include more complete or useful information. Queries can be executed on-demand via the Connect API with custom field parameters.

### Webhooks Service (Maker Webhooks)

The built-in Webhooks service allows sending and receiving arbitrary HTTP requests:

- **Receive a web request:** This trigger fires every time the Maker service receives a web request to notify it of an event. Supports up to 3 values as parameters or full JSON payloads.
- **Make a web request:** An action that allows you to send any data from IFTTT to any digital service on the internet with a public API. It is highly customizable — you can send data as GET, POST, PUT, HEAD, DELETE, or OPTIONS methods.
- The Webhooks service's two triggers and one action are available on the Pro tier. The Webhooks service also supports three queries that are available on the Pro+ tier. The webhooks service is currently not available on the free tier.

### Runtime Scripts

A runtime script is JavaScript code that runs when IFTTT detects a new trigger event. Normally a connection requires you to run a backend server that receives trigger webhooks from IFTTT, but if your case is simple enough you can avoid running your own backend by implementing your connection logic in a runtime script.

### Realtime API

With IFTTT's Realtime API, you can have Applets involving user-oriented triggers from your service run near-instantly. Simply write a hook to notify IFTTT of any changes related to a given user. Rather than sending data directly, the Realtime API is used to notify IFTTT that there are new events available at your service for a specific `user_id` or `trigger_identity` that IFTTT can then fetch through polling.

## Events

IFTTT supports webhooks for notifying your service about connection lifecycle events and trigger events.

### Connection Lifecycle Webhooks

IFTTT sends webhooks to your service's endpoint when connections are enabled or disabled by users.

- **Connection enabled:** This webhook is fired anytime a user enables your connection. Sent as `POST /ifttt/v1/webhooks/connection/enabled`.
- **Connection disabled:** Sent as `POST /ifttt/v1/webhooks/connection/disabled` when a user disables a connection. Includes the connection ID, user ID, and timestamp.

### Trigger Event Webhooks

When a trigger detects a new event, IFTTT will send a request to your API's webhook endpoint. This is how your backend is notified of new trigger events from connected services so it can execute queries and actions in response. The webhook payload includes the trigger event data and user context.

- Can be replaced by runtime scripts for simpler use cases.
- Trigger fields and event data vary depending on the connected service's trigger definition.
