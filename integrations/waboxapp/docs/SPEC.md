Let me fetch the actual API documentation PDF for more details.# Slates Specification for Waboxapp

## Overview

Waboxapp is an API service that enables integration of WhatsApp accounts with external systems and applications. It works via a Google Chrome extension that bridges WhatsApp Web to the Waboxapp API, allowing programmatic sending and receiving of WhatsApp messages. The service requires maintaining an active WhatsApp Web session through the Chrome extension.

## Authentication

Waboxapp uses **API token authentication**. Every API request requires two credentials:

- **API Token** (`token`): A unique API token provided in your Waboxapp account after signup. This token is passed as a query parameter on every request. An enabled APP token can also be used in place of the API token.
- **Account Phone Number** (`uid`): Your WhatsApp account phone number with international country code (no `+` prefix, e.g., `34666123456`). This identifies which linked WhatsApp account to use.

Both parameters are mandatory on all API calls. The token is passed as a `token` query parameter, and the phone number is passed as a `uid` parameter (or as a URL path segment for the status endpoint).

The base URL for all API calls is: `https://www.waboxapp.com/api`

To get started:

1. Sign up at `https://www.waboxapp.com/signup` and confirm your email.
2. Install the Waboxapp Google Chrome extension.
3. Configure the extension with your API token.
4. Link your WhatsApp phone by scanning the QR code (similar to WhatsApp Web).
5. Keep the Chrome extension and phone connected at all times for the integration to work.

## Features

### Send Text Messages

Send plain text WhatsApp messages to any phone number. Requires specifying the recipient's phone number (with international code) and the message text. A unique custom ID (`custom_uid`) must be provided per message to enable tracking via acknowledgement events.

### Send Images

Send images to a WhatsApp recipient by providing a publicly accessible image URL. Optional caption and description fields can be included to display a preview with the image.

### Send Links with Preview

Send a URL to a recipient with a rich link preview. Optionally specify a custom caption, description, and thumbnail image URL. If not provided, metadata is automatically extracted from the linked page.

### Send Media Files

Send any type of file (documents, PDFs, etc.) to a recipient by providing a publicly accessible file URL. Optional caption, description, and thumbnail image URL can be specified for the file preview.

### Check Account Status

Query the status of a linked WhatsApp account. Returns information including the configured webhook URL, account name, smartphone platform (e.g., Android), battery level, charging status, and locale.

- All send operations require a unique `custom_uid` per message, which is returned in acknowledgement webhook events for delivery tracking.
- The phone running WhatsApp and the computer with the Chrome extension must both remain connected and online for messages to be sent/received.

## Events

Waboxapp supports **webhooks** for real-time event notifications. A webhook URL can be configured at both the client level and individual account level. When events occur, Waboxapp sends a POST request to your configured URL.

### Message Events

Triggered when a new message is received or sent on the linked WhatsApp account. The webhook payload includes contact information (phone number, name, type — user or group), message metadata (timestamp, unique ID, direction — inbound or outbound), and message content. Supported message types include: chat (text), image, video, audio, recorded audio (ptt), document, vcard, and location. Media messages include a URL to the media content (retained for 15 days).

### Acknowledgement (ACK) Events

Triggered when the delivery status of a sent message changes. Provides the message's unique ID, your custom tracking ID, and the acknowledgement status. Status codes indicate: message not yet sent to servers (0), sent to servers (1), delivered to recipient (2), or read by recipient (3). The "read" status may appear as "delivered" depending on the recipient's privacy settings.
