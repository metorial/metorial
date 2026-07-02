# Slates Specification for WhatsApp Business

## Overview

WhatsApp Business Platform (Cloud API) is Meta's official API for enabling businesses to send and receive messages on WhatsApp at scale. It allows companies to integrate functions such as sending and receiving messages, retrieving profile information, and managing group chats within the WhatsApp Business Platform. The WhatsApp Business Cloud API is a part of Meta's Graph API.

## Authentication

WhatsApp Business Cloud API uses **Bearer Token** authentication via Meta's Graph API.

### Prerequisites

- A Meta developer account allows you to create and manage Meta apps, including WhatsApp integrations.
- WhatsApp messaging services require a Meta business portfolio (formerly called a Business Manager account).
- A Meta App with the WhatsApp product added, configured in the [Meta for Developers](https://developers.facebook.com/) dashboard.

### Access Tokens

There are two types of tokens:

1. **Temporary Access Token**: Generated from the Meta App Dashboard under WhatsApp > API Setup. Meta's authentication system uses short-lived tokens by default. These expire after approximately 24 hours and are suitable for testing only.

2. **Permanent Access Token (recommended for production)**: Create a system user in your Business Info by navigating to Settings > Users > System Users within Meta Business Manager. This is a distinct identity for programmatic access, separate from human user accounts. Then click the Generate new token button. Select your app, token expiry (never), and then select permissions `whatsapp_business_management` and `whatsapp_business_messaging`.

### Required Permissions (Scopes)

- `whatsapp_business_management` and `whatsapp_business_messaging`.
- For Business Solution Providers: `business_management` is additionally required.

### Required Identifiers

- **Phone Number ID**: Identifies the specific WhatsApp business phone number used for messaging. Found in the Meta App Dashboard under WhatsApp > API Setup.
- **WhatsApp Business Account ID (WABA ID)**: Identifies your WhatsApp Business Account. Found in the same location.

### API Base URL

All API calls are made to Meta's Graph API: `https://graph.facebook.com/v{VERSION}/`

Requests include the token as a Bearer authorization header:

```
Authorization: Bearer {ACCESS_TOKEN}
```

## Features

### Messaging

Send messages to customers via WhatsApp. Supports text, images, audio, video, documents, stickers, locations, contacts, and interactive elements (buttons, lists). The 24-hour messaging window opens when a user sends a message to your business. You can send free-form messages during this window. Outside of it, only pre-approved templates are allowed.

- **Free-form messages**: Any content type sent within the 24-hour customer service window.
- **Interactive messages**: Messages with quick reply buttons, call-to-action buttons, or list menus for structured user responses.

### Message Templates

Message templates ensure that business-initiated communication follows WhatsApp guidelines. They contain predefined text and are preformatted. These templates can be reused when the same message needs to be sent multiple times.

- Three categories: Marketing, Utility, and Authentication. Marketing templates can be used for awareness or sales purposes, while utility templates are often used for user action follow-ups. Authentication templates are primarily used to verify a person's identity.
- Template formats include: text and rich media, carousel (multiple products in a swipeable format), limited-time offer, coupon code, and flow templates.
- Templates support headers (text or media), body with dynamic variables, footers, and buttons.
- Templates must be submitted for Meta's approval before use. Most templates are reviewed by a machine learning assisted process and approved in minutes. Some that require human review can take up to 48 hours.

### Media Management

Upload and download media files (images, documents, audio, video) for use in messages. Media is uploaded to WhatsApp's servers and referenced by a media ID when sending messages.

### Business Profile Management

Retrieve and update your WhatsApp Business profile information, including business description, address, email, website, and profile photo.

### Phone Number Management

Register, verify, and manage business phone numbers associated with your WhatsApp Business Account. Businesses can define separate phone numbers for different customer segments and create different profiles for each of them.

### WhatsApp Flows

Flows help create interactive, automated chat experiences that guide users through a conversation. Think of Flows as a form-based workflow that helps manage customer interactions at scale.

- Can be used for sign-ups, surveys, appointment booking, lead capture, and similar structured interactions.
- Flows are created in Meta's WhatsApp Manager and triggered via message templates or interactive messages.

### Two-Step Verification

Enable or disable two-step verification for your WhatsApp business phone number to add an extra layer of security.

## Events

WhatsApp Business Platform supports webhooks for real-time event notifications. WhatsApp organizes its webhook events into subscribable fields. You select which fields you want in the Meta App Dashboard under your app's WhatsApp configuration.

Webhook setup requires registering a callback URL with a verify token. When you first register a webhook URL, WhatsApp sends a GET request containing `hub.mode`, `hub.verify_token`, and `hub.challenge`. Your endpoint must validate the mode and token, then respond with the challenge value. All subsequent event payloads are signed with HMAC-SHA256 using your app's App Secret.

### Messages

This is the primary field and the one most developers subscribe to first. It covers both inbound messages and outbound message status updates.

- **Inbound messages**: Notifications include the sender's phone number, the message type (text, image, audio, video, document, sticker, location, contacts, interactive, reaction, order, or system), and the message content or media reference.
- **Outbound message statuses**: Status update notifications report on messages you've sent, with statuses progressing through sent, delivered, read, and potentially failed.

### Phone Number Name Update

Fires when a phone number's display name is approved or rejected after you request a change.

### Business Capability Update

Notifies you of changes to a business's capabilities, including changes to the maximum number of business phone numbers your WhatsApp Business Account can have or a change to the messaging limit.

### Security

Security-related alerts for your account.

### Flows

Endpoint availability notifications for WhatsApp Flows integrations.
