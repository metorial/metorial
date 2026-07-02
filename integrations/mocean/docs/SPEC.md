Now I have comprehensive information about MoceanAPI. Let me compile the specification.

# Slates Specification for Mocean

## Overview

MoceanAPI (Mocean) is a communications platform founded in 2003 that provides APIs for SMS, Voice, WhatsApp messaging, Number Lookup, and phone number verification. Businesses can send SMS, WhatsApp, and voice messages worldwide through its RESTful APIs. Its APIs connect businesses to mobile users across more than 1,000 mobile networks in over 190 countries.

## Authentication

Mocean supports two authentication methods:

**1. API Token (Recommended)**

An API Token is a secure access credential generated from the Dashboard and included in every request. It's a simple and secure way to integrate with Mocean's REST APIs.

To obtain an API Token:

- Log in to the Dashboard. Go to **API Account → Generate Token**. Copy and store the token securely (it will only be shown once).

The token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer API_TOKEN_HERE
```

**2. API Key + API Secret (Legacy)**

The legacy method uses an API Key and API Secret pair. These credentials are obtained from the Mocean dashboard and passed as parameters in each request or used to initialize the SDK client. For WhatsApp template management, Basic Auth is also supported by Base64 encoding `api_key:api_secret`.

The base URL for all API calls is `https://rest.moceanapi.com`.

## Features

### SMS Messaging

Send and receive text messages to users around the globe. Programmatically send and receive high volumes of SMS anywhere in the world.

- Send SMS to single or multiple recipients (up to 500 per request) with configurable sender ID, encoding, and scheduled delivery.
- Supports Flash SMS, Unicode messages, and user data headers (UDH).
- Message scheduling using a datetime parameter (in GMT+8).
- Receive inbound SMS on rented virtual numbers via a configured webhook URL.
- Query message delivery status by message ID.
- For US and Canada, a purchased number (Toll-Free or 10DLC) is required for sending and receiving SMS.

### Voice Calls

Make and receive programmable voice calls controlled via Mocean Command (MC), a JSON-based instruction set.

- Supported MC actions: `say` (text-to-speech), `play` (audio file), `collect` (DTMF input), `sleep` (pause), `dial` (connect to a phone number), and `record` (call recording).
- Text-to-speech supports multiple languages including English, German, Chinese Mandarin, Japanese, Korean, Malay, Indonesian, Thai, Vietnamese, and Russian.
- Inbound call handling via webhooks that return MC instructions.
- Hang up active calls and download call recordings.
- Requires a virtual number for receiving inbound calls.

### Verification (OTP)

The Verify API provides businesses with a solution for identity verification and fraud prevention, supporting SMS codes, secure account verification, and two-factor authentication (2FA).

- Send verification codes via SMS or Telegram.
- Configurable code length (4 or 6 digits) and PIN validity period (60–3600 seconds).
- Resend verification codes for existing requests.
- Verify user-submitted codes against generated ones.
- Automatic retry via voice verification if SMS fails (intelligent failover).
- Optional Number Lookup before sending the verification SMS to check number validity.

### Number Lookup

The Number Lookup API allows querying mobile phone numbers about their IMSI number, reachability, ported number, as well as original and current network operator.

- Returns current and original carrier information (country, operator name, MCC, MNC).
- Indicates whether a number has been ported.
- Supports both synchronous and asynchronous (callback URL) response modes.

### WhatsApp Messaging

Send and receive WhatsApp messages through registered WhatsApp Business Account (WABA) numbers.

- Supports multiple content types: text, templates, rich media (image, audio, video, document, sticker), reactions, interactive messages (buttons, lists), location, contacts, and product/catalog messages.
- Template management: create, edit, list, retrieve, and delete WhatsApp message templates.
- Download rich media files sent by end-users.
- Templates are required for initiating conversations outside the 24-hour messaging window.

### Account Management

- Query current account balance.
- Retrieve pricing information for SMS, Number Lookup, or Verify services, filterable by MCC/MNC.
- Check the delivery status of previously sent messages.

## Events

Mocean supports webhooks for receiving real-time event notifications. Webhook URLs are configured per request or in the dashboard.

### SMS Delivery Reports

Receive delivery status updates for sent SMS messages via a webhook URL specified in the send request (`mocean-dlr-url`). Reports include delivery status (success, failed, expired), message ID, and error codes. Delivered as HTTP PUT requests.

### Inbound SMS

Receive incoming SMS messages on rented virtual numbers. Inbound messages are forwarded to a configured webhook endpoint via HTTP POST, including sender number, recipient number, message text, keyword, and timestamp.

### Voice Call Events

Receive call status events (e.g., answered, hangup) via a webhook URL specified in the outbound call request (`mocean-event-url`). Inbound calls trigger a webhook to retrieve Mocean Command (MC) instructions for call flow control. Collect actions during calls also trigger webhooks with DTMF digit input.

### WhatsApp Delivery Reports

Receive delivery status updates for WhatsApp messages via a webhook URL specified in the send request (`mocean-event-url`). Statuses include sent, delivered, read, and failed, along with Meta pricing and conversation details.

### WhatsApp Inbound Messages

Receive incoming WhatsApp messages from end-users via webhook. Supports text, media (image, audio, video, document, sticker), button replies, reactions, interactive replies, orders, and referral messages.

### Number Lookup Delivery Results

When using asynchronous mode, Number Lookup results are delivered to a specified callback URL (`mocean-nl-url`) via HTTP PUT, containing carrier information and porting status.
