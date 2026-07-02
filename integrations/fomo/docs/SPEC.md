Let me get the specific Fomo auth token details from their SDK.Now I have enough information to write the specification. Let me compile what I've found:

# Slates Specification for Fomo

## Overview

Fomo is a social proof automation platform that displays real-time customer activity notifications (such as purchases, signups, and reviews) on websites to build trust and increase conversions. It uses current customer behaviors to encourage future customers. The API allows programmatic management of notification events, templates, and application settings.

## Authentication

Fomo uses **token-based authentication** via an API token.

- **Obtaining the token**: Navigate to Settings, click Site, select your website, scroll to the bottom of the page, and copy the API token displayed there. Alternatively, the auth token can be found in the Fomo application admin dashboard under App → API Access.
- **Using the token**: Include the token in the `Authorization` HTTP header using the `Token` scheme. The header format is `Authorization: Token <your_auth_token>`.
- **API base URL**: `https://api.fomo.com`
- There are no OAuth flows, scopes, or additional credentials required. Each Fomo application (site) has its own API token.

## Features

### Event (Notification) Management

The primary API interaction is with the Events endpoint. All events are created via POST requests from your app's front-end/backend, a 3rd party integration, or Zapier, and event parameters are added to a live data feed. You can create, retrieve, search, update, and delete events.

- Events can reference a template via `event_type_id` (numeric ID) or `event_type_tag` (string tag). Users who maintain separate Fomo app instances for dev, staging, and production can use `event_type_tag` to reduce dynamic environment variables.
- Event parameters include: `title`, `first_name`, `email_address` (used to fetch Gravatar), `ip_address` (used for geolocation), `city`, `province`, `country`, `url`, and custom attribute key-value pairs.
- Events can be searched by a specific field and value.

### Template Management

Fomo delineates event parameters (e.g., first_name, city, product_name) from a notification's message structure using templates. Templates define the display format for notifications using variable placeholders. You can create templates via the API, though Fomo recommends using the application UI for managing templates.

### Application Settings

You can retrieve application statistics and update application-level settings via the API. This controls how notifications are displayed to end-users on your website, including display behavior and branding.

### Fomo Open (Public Metrics)

Fomo provides public endpoints to consume Fomo's own marketing metrics. Fomo's KPIs are available to anyone via the Open API. Available metrics include signups count, customers count, and integrations. This is a public, unauthenticated API and is unrelated to your own application's data.

## Events

Fomo supports **inbound webhooks** — it can receive webhook data from external platforms to automatically create notifications. Webhooks are data "pings" that are sent from a 3rd party platform after some trigger event occurs. Fomo provides a long webhook URL that you copy and paste into the webhook input form of the external platform of your choosing.

However, Fomo does **not** provide outbound webhooks or event subscriptions that allow external systems to listen for changes within Fomo. The webhook functionality is designed for Fomo to consume data from other platforms, not to emit events to subscribers.
