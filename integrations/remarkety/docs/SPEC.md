# Slates Specification for Remarkety

## Overview

Remarkety is an email and SMS marketing automation platform built specifically for eCommerce. It provides data-driven, automated campaigns to increase customer loyalty and lifetime value. It integrates with popular eCommerce platforms (Shopify, Magento, WooCommerce, BigCommerce) and supports custom integrations via API.

## Authentication

Remarkety uses **API Key** authentication. There are two key credentials required:

- **Store ID**: A unique identifier for your Remarkety account. To locate it, log into Remarkety, select Settings, and go to API Keys from the left-hand menu. Your Store ID will appear at the top.
- **API Key (Token)**: To generate an API Key, enter a note in the Token Note field and click Generate Token. The new token will appear in the token list.

When making server-side API requests, include the following headers:

| Header         | Description                                          |
| -------------- | ---------------------------------------------------- |
| `x-api-key`    | Your Remarkety API Key                               |
| `x-event-type` | The event type being sent (e.g., `customers/update`) |
| `x-domain`     | Your store's domain (optional)                       |
| `x-platform`   | Your eCommerce platform identifier (optional)        |
| `Content-Type` | `application/json; charset=UTF-8`                    |

For authentication, you must use one of the two methods: your store API Key in the `x-api-key` header OR your Remarkety API Key in the `x-api-key`.

The API endpoint is `https://webhooks.remarkety.com/webhooks/?storeId=<STORE_ID>`.

## Features

### Customer Management

You can create a contact or update an existing contact information via API. Customer data includes email, name, address, gender, birthdate, marketing preferences (email and SMS), tags, groups, and reward points. You can also unsubscribe a contact using an API request, which adds them to a suppression list.

### Order Tracking

Send order creation and update events to Remarkety, including full order details such as line items, pricing, discounts, shipping, tax, fulfillment status, and associated customer information. This data powers automated campaigns like cart abandonment recovery and post-purchase follow-ups.

### Product Catalog Sync

Products can be synced to Remarkety in two ways:

- **Event API**: Send product create, update, and delete events with full product details including variants, images, inventory, pricing, and categories.
- **Google Product Feed**: Use the standard Google Products feed format, which is a good option for custom carts or non-standard eCommerce websites. Remarkety can use a Google Product Feed to fetch your catalog and keep it up to date, sampling the feed once a day.

### Cart Tracking

Send cart creation and update events to enable abandoned cart recovery campaigns. Cart data includes line items, pricing, customer information, and an abandoned checkout URL for recovery links.

### Newsletter Subscription Management

Manage newsletter subscriptions and unsubscriptions via the API. Subscription events support double opt-in configuration and can include both email and SMS phone number (E.164 format). Unsubscribe events add the contact to a suppression list that persists even if future updates set `accepts_marketing` to true.

### Custom Events

With Remarkety, you can trigger automations based on various events which occur in your system. Beyond built-in eCommerce events, you can send arbitrary custom events with custom properties (e.g., site searches, room bookings) that can be used to trigger automations inside Remarkety. Remarkety has built-in event types for e-commerce, but custom events will not support advanced e-commerce analytics.

### Contact Batch Upload

Contacts can be uploaded in batch via API or CSV/SFTP import, allowing bulk creation and updating of contact records including tags and marketing preferences.

### Personalized Coupons

Remarkety supports a Personalized Coupons mechanism where Remarkety calls a discount endpoint on your store to create dynamic, single-use coupon codes for triggered campaigns.

## Events

Remarkety supports **outgoing webhooks** that POST JSON events to your configured HTTPS endpoint. You can add any endpoint to any event, and also request an event to be posted to more than one endpoint. Webhook setup is done in the Remarkety Settings page. Webhooks are authenticated using an HMAC-SHA256 signature in the `X-Event-Hmac-SHA256` header, verified against a shared secret.

### Email Events

- **email/sent**: Fired when an email is sent to a recipient.
- **email/delivered**: Fired when the recipient's email server acknowledges receipt.
- **email/opened**: Fired when an email is opened (tracked via image pixel).
- **email/clicked**: Fired when a recipient clicks a link in an email. Includes the clicked URL.
- **email/bounced**: Fired when the receiving server rejects the message. Indicates soft or hard bounce with a reason.
- **email/spam**: Fired when an email is marked as spam by the recipient.
- **email/unsubscribed**: Fired when a recipient unsubscribes via an email link.

All email events include common fields: timestamp, recipient email, campaign name, campaign ID, and a unique message key.

### Newsletter Events

- **newsletter/subscribed**: Fired when a contact's marketing preference changes to "yes" (via popup, API, or admin action). Includes signup and opt-in IP addresses.

### SMS Events

- **sms/sent**: Fired when an SMS is sent. Includes message body, phone numbers, and character count.
- **sms/clicked**: Fired when a Remarkety short URL in an SMS is clicked. Includes URL, IP, and user agent.
- **sms/replied**: Fired when someone replies to one of your Remarkety phone numbers.
- **sms/unsubscribed**: Fired when an SMS contact unsubscribes (via reply or link). Includes phone number and reason.

### Suppression Events

- **email-suppression/added**: Fired when an email is added to the suppression list. Includes suppression type (e.g., unsubscribed, hard_bounce, spam_complaint, manually_suppressed, etc.).
- **email-suppression/removed**: Fired when an email is removed from the suppression list.
