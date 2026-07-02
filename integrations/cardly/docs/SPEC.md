Now let me fetch the full API documentation to get more details on features and webhooks.I notice the page has section links for Webhooks, Contacts & Lists, Ordering, Resources, Account, etc. Let me fetch the OpenAPI spec to get detailed endpoint information.Now I have comprehensive information from the OpenAPI spec. Let me compile the specification.

# Slates Specification for Cardly

## Overview

Cardly is a platform that enables businesses to send personalized, handwritten greeting cards, postcards, and letters at scale. It uses algorithmic handwriting generation from real handwriting samples to produce physical mail, supporting delivery to over 50 countries from production facilities in the US, UK, Canada, and Australia. The API allows programmatic management of artwork, templates, contacts, orders, and webhooks.

## Authentication

Cardly uses **API key authentication**. All requests must include the API key in a custom header.

- **Header:** `API-Key: <your_api_key>`
- **Base URL:** `https://api.card.ly/v2`
- **Content-Type:** `Content-type: text/json` (required for POST requests)

API keys are obtained and managed from the organisation portal (`Settings > API Keys`). Each set provides both test and live mode keys. Test mode keys are prefixed with `test_` and live mode keys are prefixed with `live_`.

Test mode keys can perform all the functions that live keys can, but will not perform any mutations. For example, placing an order with a test key will validate the request and return a similar response, but no actual order will be placed.

All API requests must be made over HTTPS. Requests over plain HTTP or without authentication will be rejected.

**Example header:**

```
API-Key: test_QRJfLM9cGJyjdaINUPJu3XVT1QltYMJLtoncY73X
```

## Features

### Order Placement & Previews

Place orders for personalized physical cards, postcards, and letters to be printed and mailed to recipients. Each order can contain multiple line items with different artwork, templates, recipients, and sender details. Before placing a live order, you can generate a low-quality, watermarked preview PDF of the card and envelope to verify the output. Orders support a requested arrival date, shipping method selection (standard, tracked, express — availability varies by region), and a "ship to me" option that sends the card to the sender with a blank envelope. A purchase order number can be attached for auditing purposes. Sufficient prepaid account credit is required to place orders.

### Artwork Management

Upload, update, list, and delete card artwork. Artwork is associated with a specific media (product) type and consists of page images (e.g., front, inner left, inner right, back). Images are uploaded as base64-encoded strings. Both organisation-specific and shared/free artwork are available.

### Template Management

List available message templates configured in the business portal. Templates define the text layout, styling (font, color, size, alignment), writing style, and support variable substitution (e.g., `{{firstName}}`) for personalization. Templates can also include gift cards from major retailers.

### Contact & List Management

Create and manage contact lists with custom fields (text, date, number, URL types). Add, edit, search, sync, and delete contacts within lists. Contacts include name, address, email, company, and custom field data. The sync operation performs an upsert — creating a new contact or updating an existing one matched by external ID or email. Contact lists can have automation rules for automatic card sending based on triggers like birthdays or anniversaries.

### Resource Discovery

List available media types (product sizes like standard greeting cards, postcards, letters) with their physical dimensions and credit costs. Browse available handwriting fonts (cursive, hand, serif, etc.), writing styles (messiness levels for the handwriting algorithm), and doodles (vector-based decorative images for cards).

### Account Management

Query the current credit balance (card credits and gift credits) for the organisation. View credit and gift credit transaction history with time-based filtering.

### User & Invitation Management

List, find, and remove users who have access to the organisation portal. Send invitations to new users with configurable permissions (e.g., administrator, artwork, billing, campaigns, developer, lists, orders, templates, use-credits). Resend or revoke pending invitations.

### Webhook Management

Create, update, list, retrieve, and delete webhooks for receiving near-realtime event notifications. Each webhook targets a URL, subscribes to specific event types, and is secured with a secret key (provided once at creation) for signature verification. Webhooks can be enabled or disabled and support custom metadata.

## Events

Cardly supports webhooks for near-realtime event notifications. Webhooks are managed via the API and each webhook can subscribe to one or more of the following event types:

### Order Events

- **`contact.order.created`** — Triggered when a new order is placed for a contact.
- **`contact.order.sent`** — Triggered when an order item has been shipped/dispatched.
- **`contact.order.refunded`** — Triggered when an order is refunded.

### Gift Card Events

- **`giftCard.redeemed`** — Triggered when a gift card included in a sent card is redeemed by the recipient.

### QR Code Events

- **`qrCode.scanned`** — Triggered when a QR code included in a sent card is scanned by the recipient.

### Delivery Events

- **`contact.undeliverable`** — Triggered when a card is identified as undeliverable for a given contact.
- **`contact.changeOfAddress`** — Triggered when a change of address is detected for a contact.
- **`consignment.undeliverable`** — Triggered when a consignment is identified as undeliverable.
- **`consignment.changeOfAddress`** — Triggered when a change of address is detected at the consignment level.

Each webhook receives POST requests to the configured target URL. Postback authenticity can be verified using the webhook's secret key and the included signature. Webhooks support retry logic for failed deliveries.
