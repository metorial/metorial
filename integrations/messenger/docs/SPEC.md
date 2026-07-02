# Slates Specification for Facebook Messenger

## Overview

Facebook Messenger Platform is Meta's API for enabling automated messaging between Facebook Pages (businesses) and users through Messenger. It supports conversations between Facebook Business Pages and Facebook users, as well as between Instagram Professional Accounts and Instagram users. The API allows developers to send and receive messages, access user profiles, and leverage advanced features like chatbots and message templates.

## Authentication

The Messenger Platform uses **Page Access Tokens** for API authentication, issued through Meta's OAuth 2.0 flow. All API calls are made against the Graph API (`https://graph.facebook.com/v{version}/`).

### Prerequisites

- A Facebook Page will be used as the identity of your Messenger experience.
- A Facebook Developer Account is required to create new apps. You can create a new developer account by going to the Facebook Developers website.
- A Facebook App with the Messenger product added.

### Obtaining a Page Access Token

There are two approaches:

1. **Manual (via Developer Dashboard):** In the Facebook application Dashboard, go to "Messenger" setup and add a Facebook Page under "Access Tokens." Follow the process and grant permission for the application to access the Facebook Page. After the Facebook Page is added, copy the "Page ID" and click "Generate token." Once the access token is generated, make sure to copy it as it will be shown only once.

2. **Programmatic (OAuth 2.0 Login Flow):** The flow begins with redirecting the user's browser to Facebook, where they will be shown an access grant dialog. Upon granting permission, Facebook will redirect the user back to your site using a predefined callback URL. This callback will include a code that your server side application can then exchange for an access token, using your Facebook app ID and secret. You'll now use the user access token to obtain a page access token. You can query the user's pages with the `/me/accounts` API.

### Required Permissions (Scopes)

The following permissions must be requested and approved via App Review for production use:

- **`pages_messaging`** — Required to send and receive messages on behalf of a Page.
- **`pages_manage_metadata`** — Required in order to configure the Facebook app to send user messages (and other webhook events) via webhook.
- **`pages_show_list`** — This permission is included by default. It is required to be part of the access token to query the list of Pages that a person manages.
- **`pages_read_engagement`** — Required to read Page content, follower data, and metadata.

### Token Types

- **User Access Token:** Short-lived token obtained through OAuth login. Can be exchanged for a long-lived token (valid ~60 days).
- **Page Access Token:** Derived from a User Access Token; used for all Messenger API calls. Can be made non-expiring if generated from a long-lived user token.
- **System User Access Token:** For a Facebook Page associated with a business in the Meta Business Manager. Recommended for server-to-server integrations.

### App Review

While in Development mode, apps are automatically approved for all login permissions, features, and product-specific features. Once you switch your app to Live Mode, however, your app can only use permissions and features that it has been approved for. While the Facebook App is in development mode, the Message API will only be able to send messages to developers. In order to get permissions to send messages to all users the Facebook App needs to go through review.

## Features

### Sending Messages

The Send API allows sending messages from a Page to users who have initiated a conversation. Supported message types include:

- Text, images, buttons, and quick replies.
- Media content such as images, videos, and audio files, allowing chatbots to showcase visual content or play audio clips as part of conversations.
- File attachments.
- Reusable attachments uploaded from public URLs and sent later by attachment ID.
- Multiple image attachments in one message.

**Messaging Window:** Facebook Messenger has a standard messaging window of 24 hours. After 24 hours from the user's last message, businesses can only send messages using **Message Tags** (e.g., `CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`, `ACCOUNT_UPDATE`) or **Marketing Messages** (requires user opt-in).

### Message Templates

Structured message templates enable rich, interactive content beyond plain text:

- **Generic Template:** Horizontal scrollable carousel of items with images, titles, subtitles, and buttons.
- **Button Template:** Text with attached buttons (URL, postback, or call).
- **Receipt Template:** Displays order confirmations with itemized details.
- **Media Template:** Sends images or videos with optional buttons.
- **Airline Templates:** Boarding pass, itinerary, check-in, and flight update templates.

### Messenger Profile Management

Configures the appearance and behavior of the Messenger experience for a Page:

- **Get Started Button:** Displays a "Get Started" button for first-time users, triggering a postback event.
- **Greeting Text:** Allows you to specify the greeting message people will see on the welcome screen of your bot. The welcome screen is displayed for people interacting with your bot for the first time. Supports personalization with user name variables and localization by locale.
- **Persistent Menu:** A fixed navigation bar inside Messenger conversations. It's always visible to the user, providing quick access to essential actions. It's called persistent because it remains visible regardless of where the user is in the conversation. Supports up to 20 call-to-action items per locale.
- **Account Linking URL:** A profile-level URL that starts the secure webview flow used to link a Messenger PSID to an external account.
- **Ice Breakers:** Clickable questions users can select when first interacting with the bot. This helps reduce friction and guides them to the right flow.
- **Whitelisted Domains:** Specifies a list of third-party domains that are accessible in the Messenger webview for use with the Messenger Extensions SDK, the Checkbox Plugin, and the Customer Chat Plugin.

### User Profile Retrieval

The API allows retrieving basic profile information for users who have interacted with the Page, including first name, last name, profile picture, locale, timezone, and gender. Requires appropriate permissions.

### Sender Actions

Allows displaying typing indicators and read receipts to users, simulating a more natural conversation flow (e.g., `typing_on`, `typing_off`, `mark_seen`).

### Handover Protocol

Enables multiple apps to collaborate on the same Page's Messenger experience. A primary receiver app can pass thread control to secondary apps and take it back. Apps can also inspect the current thread owner and, when permitted, list configured secondary receiver apps. Useful for routing between automated bots and live agents.

### Account Linking

Allows linking a user's Messenger identity to an account in an external system. Uses a secure login flow via webview to authenticate users and associate their Messenger Page-scoped ID (PSID) with a business account.

### Built-in NLP

The ability to integrate Natural Language Processing (NLP) capabilities into chatbots. NLP allows the chatbot to understand and interpret user messages in a more human-like manner. This enables the chatbot to provide accurate and relevant responses. Built-in NLP can detect intents and entities like greetings, dates, times, amounts, and locations.

### Messaging Restrictions

- Facebook does not allow sending messages to users without user consent.
- Some features (persistent menu, media templates, URL buttons) are restricted or unavailable for users in the European Economic Area (EEA) due to privacy regulations.

## Events

The Messenger Platform supports webhooks that deliver real-time notifications when events occur in conversations with a Page. Actions that take place in conversations, such as new messages, are sent as events to your webhook.

Webhook setup requires providing a **Callback URL** (HTTPS endpoint) and a **Verify Token** during configuration. For each authorized Page, the Webhooks section will contain the fields the app can subscribe to. Click on "Add Subscriptions" to select desired fields. At a minimum, it is recommended to choose `messages` and `messaging_postbacks` to get started.

### Message Events

- **`messages`** — Triggered when a user sends a message to the Page. Includes text messages, attachments (images, audio, video, files), quick reply responses, and stickers.
- **`message_echoes`** — Triggered when a message is sent by the Page itself (echoed back to the webhook), useful for tracking messages sent by other apps or admin users.

### Delivery & Read Events

- **`message_deliveries`** — Triggered when a message sent by the Page has been delivered to the user.
- **`message_reads`** — Triggered when a user has read a message sent by the Page.

### Interaction Events

- **`messaging_postbacks`** — Triggered when a user taps a postback button, Get Started button, or persistent menu item.
- **`messaging_referrals`** — Triggered when a user arrives in a conversation via a referral link (e.g., m.me link with a ref parameter, ads, or parametric Messenger codes).
- **`messaging_optins`** — This callback will occur when the Send to Messenger plugin has been tapped, a user has accepted a message request using customer matching, or a user has opted in to receive messages via the checkbox plugin.

### Account & Policy Events

- **`messaging_account_linking`** — Triggered when a user links or unlinks their account through the account linking flow.
- **`messaging_policy_enforcement`** — Triggered when an action is taken against the Page for policy violations (e.g., messaging blocked).

### Handover Protocol Events

- **`messaging_handovers`** — Triggered when thread control is passed between apps via the handover protocol (pass thread control, take thread control, request thread control).
- **`standby`** — Delivers a copy of message events to secondary receiver apps when the primary receiver has thread control.

### Game & Commerce Events

- **`messaging_game_plays`** — Triggered when a user completes a round of an Instant Game in Messenger.
- **`messaging_payments`** (deprecated/beta) — Related to payment processing within Messenger conversations.
- **`messaging_pre_checkouts`** / **`messaging_checkout_updates`** — Related to in-Messenger commerce flows.

### Reactions

- **`message_reactions`** — Triggered when a user reacts to a message with an emoji reaction (e.g., love, wow, angry).
