# Slates Specification for Userlist

## Overview

Userlist is an email marketing automation platform designed for SaaS companies. It provides tools for managing users and companies, tracking behavioral events, sending marketing and transactional emails, delivering in-app messages, and building automated workflows. The API is primarily a write-only Push API for ingesting data, plus outbound webhooks for receiving notifications.

## Authentication

All requests to the Push API need to have the Push API Key in the `Authorization` header.

The authentication scheme uses a custom `Push` token type in the `Authorization` header:

```
Authorization: Push your-push-key-here
```

- **Credential**: Push API Key (a single secret string).
- **Where to obtain**: The only required configuration is the Push API Key. You can get your Push API key via the Push API settings in your Userlist account.
- **Base URL**: `https://push.userlist.com`
- **Additional credential (optional)**: A Push ID is also available and is required only for generating JWT tokens for in-app messages. To use in-app messages, you must configure both the `push_key` and the `push_id` configuration variables.

There is no OAuth2 flow. Authentication is solely via the Push API Key.

## Features

### User Management

Create, update, and delete user records in Userlist. Users are identified by a unique identifier and/or email address. You can attach custom properties (key-value pairs), set a signup timestamp, manage subscription preferences for messaging topics, and associate users with companies.

- Users can be identified by either `identifier` or `email` (at least one is required).
- Custom properties support strings, numbers, booleans, arrays, objects, and null values. Nested properties are supported.
- Subscription preferences can be set per topic.

### Company Management

Create, update, and delete company (organization) records. Companies represent the accounts or organizations that your users belong to. Companies support custom properties and can be linked to users through relationships.

- Companies are identified by a unique `identifier` (required).
- Properties like name, signup date, and custom attributes can be set.

### Relationship Management

Create, update, and delete many-to-many relationships between users and companies. Relationships can carry custom properties (e.g., a user's role within a company).

- Both user and company identifiers are required to define a relationship.
- Relationship properties (e.g., role) can be set and updated independently.

### Event Tracking

Track custom behavioral events performed by users or companies within your product. Events have a name and can carry custom properties describing the action.

- Events can be associated with a user, a company, or both.
- An optional `occurred_at` timestamp can be provided; otherwise, the current time is used.
- Event names are normalized to `snake_case`.

### Transactional Messages

Send one-off transactional messages (email or in-app/web) to individual users. You can use predefined templates or compose custom messages with subject, body, and sender configuration.

- Messages can be sent via `email` or `web` channel.
- When using a template, only the template identifier and recipient are required. Custom properties can be passed to personalize the template using Liquid.
- Custom messages support HTML, plain text, or multipart body formats.
- Optional configuration includes sender, theme, topic, reply-to address, and preheader text.

### Client-Side Tracking & In-App Messages

Userlist provides a client-side JavaScript tracking script that can also power in-app messages. To use in-app messages, a JWT token must be generated server-side using the Push Key and Push ID.

## Events

Webhooks let you receive real-time HTTP POST notifications whenever something happens in your Userlist account, such as when a user is created, a company is updated, or a message is clicked.

Webhooks are configured in the Userlist integration settings. You specify an endpoint URL and subscribe to specific event types. Payloads are signed using HMAC SHA-256 via the `X-Userlist-Signature` header for verification. Failed deliveries are retried up to 10 times with exponential backoff.

### User Events

Notifications for user lifecycle changes:

- **User Created**: Triggered when a new user is created.
- **User Updated**: Triggered when an existing user is updated.
- **User Subscribed**: Triggered when a user subscribes to messages (globally or for a specific topic). Includes optional topic information.
- **User Unsubscribed**: Triggered when a user unsubscribes from messages (globally or for a specific topic). Includes optional topic information.

### Company Events

Notifications for company lifecycle changes:

- **Company Created**: Triggered when a new company is created.
- **Company Updated**: Triggered when an existing company is updated.

### Relationship Events

Notifications for changes to user–company relationships:

- **Relationship Created**: Triggered when a new relationship between a user and a company is created. Includes user, company, and relationship details.
- **Relationship Updated**: Triggered when an existing relationship is updated.

### Form Events

- **Form Submitted**: Triggered when a user submits a Userlist form.

### Message Events

Notifications for message delivery and engagement:

- **Message Enqueued**: Triggered when a message is queued to be sent to a user. Includes the message ID and subject (subject omitted for transactional messages).
- **Message Opened**: Triggered when a user opens a message.
- **Message Clicked**: Triggered when a user clicks a link in a message. Includes the clicked URL (omitted for transactional messages).
