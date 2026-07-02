Now let me get more details on the full API feature set including post/letters, email, voice, contacts, and automations:Now I have enough information to compile the specification. Let me also check the sidebar of the docs page I already fetched to understand the full feature set including automations and contacts:

# Slates Specification for ClickSend

## Overview

ClickSend is a cloud-based communications platform that provides APIs for sending and receiving SMS, MMS, voice (text-to-speech), transactional email, fax, physical post (letters and postcards), and rich messaging (RCS). It lets businesses send bulk SMS, email, fax, and letters worldwide. The API also supports contact management, number purchasing, subaccounts, and inbound message automation.

## Authentication

Basic HTTP authentication should be used in the header.

- **Username**: Your ClickSend API username
- **Password**: Your ClickSend API key (not your account password)

Click the key icon in the top-right corner of the dashboard. From here, you can view your Username and API Key.

The Authorization header is constructed as follows: Username and password are combined into a string `username:password`. The resulting string is then encoded using Base64 encoding. The authorization method and a space i.e. "Basic " is then put before the encoded string.

**Example header:**

```
Authorization: Basic base64(username:api_key)
```

The base URL for all API requests is `https://rest.clicksend.com/v3`.

There is only one authentication method (HTTP Basic Auth). OAuth is not supported.

## Features

### SMS Messaging

Send and receive SMS messages globally. Supports scheduling messages for future delivery (using Unix timestamps), custom sender IDs (alphanumeric up to 11 characters), and URL shortening with click tracking. Messages can be sent to individual recipients or to contact lists. SMS campaigns can also be created for bulk marketing sends.

- Messages can include a custom string for your own reference/tracking.
- URL shortening can be enabled to automatically detect and shorten one URL per message, or disabled to leave URLs in original form (default).
- Scheduled messages can be cancelled individually or in bulk.
- SMS history and delivery receipts can be retrieved and exported.

### MMS Messaging

Send MMS messages with multimedia content (images, video). Supports scheduling and sending to contact lists. MMS campaigns are also available for bulk multimedia messaging.

- Requires a subject line and a valid media file URL.

### Voice Messaging

Send text-to-speech voice calls to mobile phones and landlines. Messages are converted from text to speech and delivered as phone calls.

- Configurable voice gender and language options.
- Supports scheduling and sending to contact lists.

### Transactional Email

Send transactional emails via SMTP gateway. Manage allowed email addresses and sender verification. View email history and delivery statistics.

### Fax

Fax is no longer being offered to new customers. For existing customers, faxes can be sent using a PDF file URL or uploaded document. Supports scheduling and viewing fax receipts and history.

### Post (Letters and Postcards)

Personalize letters and have them printed, folded and posted with a few clicks. Send physical letters (A4 PDFs) and postcards via ClickSend's automated print-and-mail service to addresses worldwide.

- Letters are printed, enveloped, stamped, and dispatched automatically.
- Postcards use uploaded designs.
- Post return addresses can be managed.
- Post history can be viewed and exported.

### Rich Messaging (RCS) — Beta

Create and send rich multimedia experiences or engage in real-time conversations by RCS or Messaging Apps. This feature is in beta.

### Contact Management

Create and manage contact lists and individual contacts within those lists. Contacts can be imported and used as recipients for SMS, MMS, voice, and post campaigns.

- Contacts include fields like phone number, email, first name, last name, address, and custom fields.
- Contact lists can be used as send targets for campaigns.

### Dedicated Numbers

Purchase and manage dedicated phone numbers for sending and receiving messages. Numbers are available in various countries.

### Sender IDs

Register and manage alphanumeric sender IDs for SMS. Some countries require registered sender IDs before messages can be sent.

- Alphanumeric sender IDs are limited to 11 characters with no spaces.
- Some countries do not support Alpha Tags.

### Subaccount Management

Create and manage subaccounts under your main account. Useful for resellers or organizations needing to separate usage and billing across departments or clients.

### Automations (Inbound Rules)

Inbound rules allow you to automate responses and actions when you receive SMS, MMS, emails, voice messages or faxes. You may use them for sending auto-replies, forwarding messages or moving contacts into specific lists.

- Rule types include: auto-reply, forward to URL (webhook), forward to email, forward to phone, create contact, move contact, and poll.
- Rules can be filtered by keyword matching on the dedicated number.

### Statistics and Reporting

View delivery statistics across messaging channels. Export message history (SMS, voice, fax, post) for reporting purposes. Track link click-through rates when using URL shortening.

### File Uploads

Upload files (e.g., PDFs for fax or post) to ClickSend's servers to be used in send operations. Files can be converted to supported formats (e.g., convert to fax-compatible PDF).

### Account Management

View and update account details, check balance, manage billing, and view usage reports broken down by subaccount.

## Events

ClickSend supports webhooks for receiving real-time notifications about messaging events. Webhook URLs are configured through automation/inbound rules either via the dashboard or the API.

### SMS Delivery Receipts

When you send an SMS, a delivery receipt is generated and can be received at your webhook URL. Delivery receipt rules can be created via the API, specifying a webhook URL where receipt data is posted when the delivery status of a sent SMS changes.

- Webhook delivery method can be configured as POST, GET, or JSON.

### Inbound SMS

Receive notifications when an SMS is sent by a recipient to your dedicated number. Inbound SMS are messages sent by your recipient to you. Webhook URLs receive the inbound message data.

- Rules can match on specific keywords.
- Delivery method options: POST (default), GET, or JSON format.

### Inbound MMS / Voice / Fax / Email

Inbound automation rules can also be configured for MMS, voice messages, fax, and email channels, using the same rule-based webhook forwarding mechanism as SMS. Each channel supports forwarding inbound messages to a URL endpoint.
