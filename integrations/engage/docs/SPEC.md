The most likely "Engage" as a standalone product for an integration platform is **Engage** (engage.so) — a customer messaging and automation platform. Let me research it further.Now let me check the Engage.so website for more about its features and whether it supports webhooks.Based on my research, Engage (engage.so) is a customer engagement platform. It does not appear to offer outbound webhooks or event subscriptions via its API — it primarily consumes data from other services via webhooks (e.g., Paystack, FastSpring) rather than providing its own webhook/event system for external consumers. Let me check the batch requests page for completeness.Now I have comprehensive information to write the specification.

# Slates Specification for Engage

## Overview

Engage (engage.so) is a customer engagement and automation platform for SaaS businesses. It provides a customer data platform (CDP), customer segmentation, multichannel messaging (email, SMS, push notifications), automation workflows, live chat, shared inbox, and help center features. The API allows managing users/customers, lists, event tracking, and sending transactional messages.

## Authentication

Authentication is via HTTP Basic Authentication using your API key as username and API secret as password. You can view and manage these keys on the settings page of your account dashboard.

- **Method**: HTTP Basic Auth
- **Username**: Your Engage API key
- **Password**: Your Engage API secret

On some endpoints, you can use just your API key (as username) and leave the secret empty. This enables calling those endpoints from client-side applications. Endpoints that support this are documented as "works with username authentication."

- **API Base URL**: `https://api.engage.so/v1`
- All requests must be made over HTTPS.

## Features

### User/Customer Management

Create, retrieve, update, list, archive, and delete customers and accounts. The Engage API lets you interact with data and resources through REST. Users can have standard attributes (first name, last name, email, phone number) and custom metadata attributes (key-value pairs of strings, numbers, or booleans). Users can be converted between Customer and Account types. Customers can be added to Accounts with optional roles. Users can be merged together, combining their data into a single profile.

- Each user is identified by a `uid` (your application's unique user identifier) which should be stable (not an email or other mutable field).
- Device tokens (for push notifications) can be managed per user, supporting Android and iOS platforms.
- Users can be filtered by email when listing.

### Accounts

Accounts represent organizational entities (e.g., companies) that customers belong to. A user can be created as an Account, and individual customers can be added to accounts with specific roles. You can retrieve account members and manage customer-account relationships.

### Lists Management

Create, retrieve, update, and archive subscription lists. Lists group customers for targeted messaging and campaigns.

- Lists support double opt-in confirmation emails for new subscribers.
- Lists can have a redirect URL for post-subscription behavior.
- Users can be subscribed, unsubscribed, or removed from lists. Unsubscribing preserves the user in the list but stops engagements; removing deletes them entirely.

### Event Tracking

Track custom user events for segmentation and automation purposes. Events have a title, optional value, optional properties (key-value pairs), and optional timestamp. Events can be used to trigger automated workflows and segment users based on their behavior in your application.

### Transactional Email

Send transactional emails through Engage or a connected Email Service Provider (ESP). Supports HTML content, text content, or pre-built templates with template variables. Emails can include CC, BCC, reply-to addresses, and optional click/open tracking.

- The sender email domain must match a domain connected to Engage or registered with your ESP.
- Templates created on the Engage dashboard or ESP can be referenced by name/identifier.
- Free accounts are limited to 100 transactional emails per day when using Engage as the ESP.

### Transactional SMS

Send transactional SMS messages through integrated SMS providers. Supported providers include Twilio, Termii, Africa's Talking, KudiSMS, and Hollatags. The `source` parameter is always required to specify which provider to use.

- Optional click tracking rewrites links in the SMS body.
- For Termii and KudiSMS, a `channel` parameter can distinguish between promotional (`generic`) and transactional/OTP (`dnd`) messages.

### Transactional Push Notifications

The API documentation indicates push notification sending is planned but not yet available.

### Batch Operations

Multiple user creation, attribute update, and event tracking operations can be combined into a single batch API call. Batch requests are processed asynchronously and return a queued status without validating individual items upfront.

## Events

The provider does not support events. Engage does not offer outbound webhooks or event subscription mechanisms through its API. It consumes webhook data from third-party services (e.g., payment providers, ESPs) but does not expose its own webhook or event push system for external consumers to subscribe to.
