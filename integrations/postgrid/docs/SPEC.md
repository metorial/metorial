Let me get the specific webhook event types from PostGrid's documentation.Now I have all the information needed to write the specification.

# Slates Specification for Postgrid

## Overview

PostGrid is an offline communication platform that provides two core API services: a Print & Mail API for programmatically sending physical letters, postcards, cheques, and self-mailers, and an Address Verification API for validating, standardizing, and autocompleting postal addresses across the US, Canada, and 245+ countries internationally.

## Authentication

PostGrid uses API key-based authentication for both its Print & Mail and Address Verification APIs.

**API Key Authentication:**

- All requests can be authorized via an `x-api-key` HTTP header.
- You can retrieve your API key from the dashboard inside the Settings page.
- Every user in the organization is provided 2 API keys: a **test key** and a **live key**. API calls made with the test key operate in an isolated sandbox, and resources managed in test mode will not affect the live environment, and vice versa.

**Address Verification API Keys:**

- You can create an API key by accessing the Developers section of the platform, clicking "Create new access key" and selecting the type of key you want.
- For batch verification, you must use a secret key.
- There are also **public keys** available for client-side address autocomplete integrations on websites.

**Key types:**

- **Test key** – for development and testing; no real mail is sent and no charges are incurred.
- **Live key** – for production use; real mail is printed and sent.
- **Public key** (Address Verification only) – for client-side autocomplete widgets.
- **Secret key** (Address Verification only) – for server-side and batch verification operations.

The Print & Mail API base URL is `https://api.postgrid.com/print-mail/v1/` and the Address Verification API base URL is `https://api.postgrid.com/addver/`.

## Features

### Contact Management

Create and manage contacts (recipients and senders) with name, address, and other details. Contacts can be reused across multiple mailings. Contact creation can be done using the dashboard or directly from the API.

### Template Management

There are two primary ways of providing printable content: predesigned PDFs or HTML with personalizable variables. In either case, address information is automatically stamped on the final mailing. Templates support merge variables using `{{variableName}}` syntax for dynamic personalization. Templates can also be created using a built-in visual editor.

### Sending Letters

Send physical letters programmatically by specifying sender, recipient (as contact IDs or inline addresses), and content (as a template ID, HTML, or PDF URL). Options include address placement, perforation, certified/registered mail, express shipping, and return envelopes.

### Sending Postcards

Send physical postcards with customizable front and back content. Various postcard sizes are supported with country-specific guidelines.

### Sending Cheques (Checks)

Send physical cheques by specifying a bank account, amount, recipient, and optional memo/message. Supports attaching invoice PDFs. Digital checks (e-checks) are also supported.

### Sending Self-Mailers

Send self-mailer pieces (folded mail without an envelope) programmatically.

### Return Envelopes

Order and include business reply envelopes (BREs) with letter mailings, enabling recipients to send responses back.

### Order Tracking

Track the status of mail orders through their lifecycle: ready → printing → processed for delivery → completed. Soon after an order has been processed, a tracking number is added which can be used to track via USPS. US-destined orders also receive Intelligent Mail Barcode (IMB) tracking with statuses like entered mail stream, out for delivery, and returned to sender.

### Address Verification (US/Canada)

Verify, standardize, and autocomplete US and Canadian addresses in real-time, with batch verification for processing large volumes. Addresses are validated against CASS (USPS) and SERP (Canada Post) certified databases.

### International Address Verification

Autocomplete, verify, and standardize international addresses in real-time across 245+ countries, with batch verification also available.

### Address Autocomplete

Provide type-ahead address suggestions for both domestic and international addresses, suitable for embedding in web forms and applications.

### Address Change Detection (NCOA)

If a mailed recipient has moved, PostGrid may redirect mail to their new address (depending on subscription tier). Address changes are applied directly to the affected contacts/orders.

### PDF Processing

Extract address fields from PDFs using OCR (PDF Wizard), resize/rotate PDFs, and render PDFs from HTML templates.

### QR Code & PURL Trackers

Add QR codes or Personalized URLs (PURLs) to track individual mailpieces and direct recipients to online channels.

### Campaigns

Send bulk mailers to lists of contacts using campaigns, managed through the dashboard or API.

## Events

PostGrid supports webhooks for its Print & Mail API, allowing you to receive notifications when events occur on mail orders. Webhooks notify the provided URL for any updates for the enabled events. Each webhook includes a secret for signature verification.

### Mail Order Events

The following event types can be subscribed to:

- **Letter Events** (`letter.created`, `letter.updated`): Triggered when a letter is created or its status/details change (e.g., status transitions, address changes from NCOA).
- **Postcard Events** (`postcard.created`, `postcard.updated`): Triggered when a postcard is created or updated.
- **Cheque Events** (`cheque.created`, `cheque.updated`): Triggered when a cheque is created or updated.
- **Self-Mailer Events** (`self_mailer.created`, `self_mailer.updated`): Triggered when a self-mailer is created or updated.
- **Return Envelope Order Events** (`return_envelope_order.created`, `return_envelope_order.updated`): Triggered when a return envelope order is created or updated.

If you want to listen for when an order's status has updated, you listen for the updated events. For example, you could listen for `letter.updated`, `postcard.updated`, and `cheque.updated` to receive notifications for any of these types. You can listen to as many or as few events as you need.

Webhooks can be created and managed both via the API and the dashboard. Each webhook is configured with a target URL and a list of enabled event types.
