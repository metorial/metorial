Now let me fetch the full list of system webhook event types from the Iterable documentation:Now I have enough information to compile the specification.

# Slates Specification for Iterable

## Overview

Iterable is a cross-channel marketing automation platform that enables businesses to send personalized messages via email, push notifications, SMS, in-app messages, web push, and WhatsApp. Its REST API allows interaction with a project's users, templates, campaigns, journeys, and more. Developers can integrate Iterable into their existing systems to manage user data, track events, and automate marketing workflows.

## Authentication

Iterable uses **API key authentication**. To authenticate with the API, you must use an API key.

**How to authenticate:**

- For regular API keys, include the key in an `Api-Key` or `Api_Key` header.
- For JWT-enabled API keys, an HTTP request must include an `Authorization` header (Bearer schema) whose value is a valid JSON Web Token.

**API Key Types:**

Iterable provides different key types with different permission levels:

- **Server-side (Standard):** Server-side API keys have the highest level of access to read and/or update data, and should only be used by servers making API calls, where they can be kept secret. This is the recommended type for backend integrations.
- **Client-side (Mobile, Web, JavaScript):** Client-side API keys can access only a limited set of Iterable's API endpoints. These support optional JWT authentication for additional security.

**Key details:**

- Every Iterable API key is associated with a specific Iterable project, which means it's also associated with a specific data center.
- The base URL depends on the data center: `https://api.iterable.com` for US-based projects, or `https://api.eu.iterable.com` for EU-based projects.
- API keys are created under **Integrations > API Keys** in the Iterable dashboard.
- Iterable only allows API keys to be managed by Org Admins or members with the Project Configuration > Data Feeds, Third-Party Integrations, API Keys and Webhooks permission.

**JWT-enabled keys (client-side only):**

- The JWT is an HMAC SHA256-signed string whose payload includes the email or user ID of the specific Iterable user profile to whose data it provides access.
- Iterable does not create JSON Web Tokens for you. You must generate them on your server for each of your users individually.
- JWT authentication security cannot be changed after you create your API key.

## Features

### User Management

Create, update, delete, and retrieve user profiles. Users can be identified by email address or userId. Supports updating custom data fields on user profiles, managing subscription preferences, and merging duplicate user profiles. Bulk user updates are available for large, non-time-sensitive operations.

### Event Tracking

Track custom events and commerce events (purchases, cart updates) associated with users. An Iterable project can contain up to 8,000 unique custom event field names. Events can include arbitrary data fields and can be attributed to specific campaigns. Commerce events track purchases and shopping cart items and unlock commerce-specific campaign metrics.

### Campaign Management

Create new blast or triggered campaigns from existing templates. Campaigns can be created for email, push notification, web push notification, SMS, and in-app message channels. Campaigns can be listed, archived, and have their metrics retrieved. Recurring campaigns and their child campaigns can also be managed.

### List Management

Create and manage lists of users for targeting in campaigns. Subscribe and unsubscribe users to/from lists individually or in bulk. Lists are used to define audience segments for campaign sends and journey entry.

### Template Management

Create and manage message templates across all supported channels (email, push, SMS, in-app, web push). Templates support Handlebars-based personalization with user profile data and event data.

### Journeys (Workflows)

Interact with journeys programmatically, including triggering journeys for users via API-triggered campaigns. Journey exit events are tracked by the system.

### Messaging / Transactional Sends

Send targeted messages to individual users via API-triggered campaigns across all supported channels. Supports passing dynamic data fields at send time for personalization.

### Catalog Management

Create and manage catalogs of items (e.g., products) that can be referenced in message templates for personalization. Catalogs contain named collections of items with custom attributes.

### Snippets

Iterable's Snippets API allows you to create, retrieve, update, and delete snippets, which work as reusable content blocks that can be embedded in templates.

### Data Export

Export user data, event data, and campaign metrics. Supports asynchronous CSV exports for large datasets. Event data can be exported by channel type (email, push, SMS, in-app, web push).

### Channels and Message Types

Manage messaging channels and message types, which control how subscription preferences are organized for users.

## Events

Iterable supports **system webhooks** that send real-time data to external endpoints when system events occur. A system webhook sends data from Iterable to a third-party system whenever a specified event occurs. Each system webhook is specific to an Iterable project, but not to a particular template, campaign, or journey. The webhook sends whenever a specified system event occurs anywhere in the project.

Webhooks are configured in the Iterable dashboard under **Integrations > System Webhooks**. It is not possible to use Iterable's API to configure webhooks. Webhooks are sent as HTTP POST requests with JSON payloads to an HTTPS endpoint you specify.

The following event categories can trigger a system webhook:

### Email Events

Blast send, triggered send, bounce, click, complaint (spam), open, send skip, subscribe, and unsubscribe events related to email messages.

- An option to **Exclude List Update Events** is available to prevent list membership changes from triggering subscribe/unsubscribe webhooks, limiting triggers to user-initiated actions only.

### Push Notification Events

Bounce, open, send, send skip, and uninstall events for mobile push notifications.

### SMS Events

Bounce, click, received (inbound reply), send, and send skip events for SMS messages.

### In-App Message Events

Click, delete (consume), recall, open, send, and send skip events for in-app messages.

### Web Push Events

Click, send, and send skip events for web push notifications.

### Embedded Messaging Events

Click, impression, received, and session events for embedded messages.

### WhatsApp Events

Received and seen events for WhatsApp messages.

### Subscription Events

Subscribe and unsubscribe events that are universal across all channels.

### Journey Events

Journey exit events, triggered when a user exits a journey.

### Hosted Unsubscribe

Hosted unsubscribe click events, triggered when a user clicks a hosted unsubscribe link.

**Webhook configuration options:**

- Authentication via Basic auth, OAuth 2.0, or custom HTTP headers.
- Custom headers can be added to each webhook request.
- Webhook payloads include user identifiers (email/userId), event name, and a `dataFields` object with event-specific data (campaign info, template info, timestamps, etc.).
