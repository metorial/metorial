# Slates Specification for Heap

## Overview

Heap is a digital analytics platform that automatically captures user interactions (clicks, taps, pageviews, form submissions) on websites and mobile apps without manual event tagging. It provides product analytics, funnel analysis, segmentation, and retroactive analysis capabilities. Heap also offers server-side APIs for enriching autocaptured data with custom events, user properties, and account properties.

## Authentication

Heap uses two authentication mechanisms depending on the API operation:

**1. App ID (Environment ID)**

- Heap supports API key based authentication.
- Most server-side API operations (Track, Add User Properties, Add Account Properties) require an **App ID** (also called Environment ID), which is included in the JSON request body as the `app_id` field.
- Both the App ID and API Key can be found within the left hand side menu via: 'Administration' -> 'Account' -> 'Manage' -> 'Privacy & Security'. Select the 'Use the API' tab.
- The base URL for standard server-side API calls is `https://heapanalytics.com/api/`.
- If your Heap data is in an EU datacenter, you must send server-side API calls to `https://c.eu.heap-api.com` instead of `https://heapanalytics.com`.
- No additional authorization headers are needed for data ingestion endpoints; the `app_id` in the request body serves as authentication.

**2. Auth Token (for User Deletion)**

- The User Deletion API requires an auth token, which you can generate.
- The auth token is obtained by calling `POST https://heapanalytics.com/api/public/v0/auth_token` using HTTP Basic Authentication with your App ID and API Key as credentials.
- The token generated expires in 5 minutes and is used as a Bearer token in the Authorization header for deletion requests.

**3. OAuth 2.0 (for Partner/Segment Sync Integrations)**

- Authorization for the Segment Sync / Partner Integration API is obtained via OAuth 2.0, using a Client ID, Client Secret, and Redirect URI.
- This is used when building integrations that receive segment data from Heap via webhooks.

## Features

### Custom Event Tracking

Send custom events to Heap server-side, recommended for events that need to exactly match your backend, such as completed order transaction info, or events that are not available for Heap to capture on the client-side. Events can be sent individually or in bulk. Each event requires either a user identity or user ID, an event name, and optional key-value property pairs.

### User Identity Management

Attach a unique identity and maintain user histories across sessions, devices, and browsers under a single profile in Heap. The server-side Identify API allows linking anonymous users to known identities. Heap does not allow you to change an already applied identity or assign multiple identities to the same user.

### User Properties

Attach custom properties at the user level, such as user-level info from your database or demographic info. The server-side add_user_properties API allows you to set user-level properties without having to tie them to an existing session, useful for backfilling values that may not have been available at the time someone was visiting your site. Properties can be added individually or in bulk.

### Account Properties

Attach custom properties at the account level to group users by organization or account. Account properties can be added individually or in bulk, and are useful for B2B analytics where you want to associate attributes like company name, plan tier, or industry with groups of users.

### User Deletion

The User Deletion API allows you to delete users and their data from your Heap workspace. The user deletion API checks all environments in your account for a matching user and deletes their records and data. You can delete users using either their identity or their user ID. This is primarily used for data privacy compliance (GDPR, CCPA).

### Segment Sync (Data Out)

You can use the Segments Sync API to build private integrations that send segment data to your internal systems. These do not need to be published to be used within your own account. Heap will call a configured webhook endpoint every 4 hours with information about which users have entered or exited the segment since the last call.

## Events

Heap supports webhooks for two categories of outbound events:

### Event-Based Webhooks (Beta)

Webhooks are available, but it is a beta feature with limited support. These webhooks fire when a defined event occurs in Heap. You configure a webhook by selecting a labeled event as the trigger and specifying a destination URL. You can determine what information is included about users when they take the action, such as their identity, device, and referrer, by selecting properties to pass through.

### Segment Sync Webhooks

Heap calls a configured webhook endpoint to receive segmentation data. Heap will call this endpoint every 4 hours with information about which users have entered or exited the segment since the last call. This allows syncing user segment membership to external systems. You can configure which user identity property is used to match users between Heap and the receiving system. Webhook callbacks from Heap contain a Heap-Hash header that contains information to validate the authenticity of the message.
