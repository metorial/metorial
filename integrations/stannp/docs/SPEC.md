Now let me get the specific webhook events list:Now I have all the information I need to write the specification.

# Slates Specification for Stannp

## Overview

Stannp is a direct mail automation platform that enables sending physical postcards, letters, greetings cards, and self-mailers programmatically. It provides APIs for managing recipients, campaigns, and mail dispatch to the US, UK, Canada, and worldwide destinations. The platform also supports SMS messaging.

## Authentication

Every API call requires authentication. You can authenticate by passing your unique API key with each request, either as a GET parameter (`api_key`) or using HTTP basic auth.

You can find your API key at the bottom of your settings page in your Stannp account dashboard.

To use the API you must have an active account on at least the Starter subscription plan.

**API Key as GET parameter:**

```
https://api-us1.stannp.com/v1/user/info?api_key={API_KEY}
```

**API Key via HTTP Basic Auth:**

```
curl "https://api-us1.stannp.com/v1/user/info" -u {API_KEY}:
```

Note: The password field is left empty when using basic auth (the colon after the key with no value).

All API requests must be made over HTTPS for encryption. Requests made over HTTP will fail and could suspend your API key.

The base URL varies by region:

- **US:** `https://api-us1.stannp.com/v1/`
- **UK/EU:** `https://dash.stannp.com/api/v1/`

## Features

### Postcards

Send personalized postcards programmatically. Supports various sizes (e.g., A5, A6). You can provide a front image and back message, or use a pre-designed template. You can add an optional parameter `test=true` when creating a postcard or letter to get a sample PDF without it actually being sent and without affecting your balance.

### Letters

Create and send individual letters or pre-mail-merged letters. Letters support options such as duplex printing, tags for tracking, and add-ons like first-class postage. You can supply a template ID or provide full PDF content.

### Greetings Cards

Send full-colour greetings cards (A5, printed on 300gsm stock).

### SMS

Trigger outbound SMS messages to contacts in your mailing lists.

### Recipient Management

Perform operations on recipients including get, create, delete, and list. Recipients can be assigned to groups, and duplicate handling can be configured (e.g., update on duplicate). Recipient data includes name, address, and custom fields.

### Groups

Organize recipients into groups (mailing lists). Add to pre-existing groups or import whole groups through the API. Groups serve as the targeting mechanism for campaigns.

### Campaigns

Perform operations on campaigns including get, create, delete, and list. Campaigns tie together a design template with a recipient group to orchestrate bulk mail sends. Campaign statuses include producing, dispatched, and cancelled.

### Reporting

Retrieve summary data and lists of mailpiece objects sent within a specified date range. Status and tag filters are optional. Statuses tracked include received, printing, handed over, local delivery, delivered, returned, and cancelled.

### Address Validation

Verify that a recipient address is valid before sending mail.

### File Management

Upload and manage files (e.g., images, PDFs) used as templates or front/back artwork for mail pieces.

### Account Management

Retrieve account information and check your current balance.

### Selections

Create saved selections (queries/filters) against your recipient data to target specific segments for campaigns.

### Tools

Utility functions including address lookup and QR code generation. QR codes can be added to postcards or letters to track recipient engagement.

## Events

Webhooks allow you to subscribe to events that happen within the Stannp Direct Mail platform. Stannp sends an HTTP POST request to the webhook's configured URL. Webhooks can be used to update any external software or notify you of key events.

Webhooks can be created and managed on the webhooks page found in your Stannp account settings. Webhooks support signed payloads using a shared secret and HMAC SHA-256 for verification.

### Campaign Status

Triggers whenever a campaign's status changes. Status codes include: **printing**, **dispatched**, **cancelled**.

### Mailpiece Status

Triggers whenever an individual mailpiece's status changes. Status codes include: **printing**, **dispatched**, **cancelled**, **local_delivery**, **delivered**, **returned**.

### Recipient Blacklisted

Triggers whenever a recipient has been blacklisted from receiving mail.

### Recipient Event

Triggers whenever a new recipient event is recorded. This can be used to detect when a client scans a Stannp-generated QR code added to a postcard or letter.
