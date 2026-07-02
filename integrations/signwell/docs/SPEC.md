Let me get more details on the events and webhook event types.The event data page didn't render full content. Let me search for the specific event types.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Signwell

## Overview

SignWell is an electronic signature platform that enables creating, sending, and managing legally binding e-signature documents. It complies with ESIGN, UETA, HIPAA, and GDPR and supports embedded signing experiences within third-party websites and applications.

## Authentication

SignWell uses API Key token authentication. All requests are authenticated by passing the API key in the `X-Api-Key` header.

**How to obtain an API key:**

Go to the Settings → API page in your SignWell account and create your API key.

**Usage example:**

```
curl https://www.signwell.com/api/v1/me -H 'X-Api-Key: "your_api_key"'
```

**Test mode:**

While developing, you can enable "test mode" requests for chargeable resources by passing the appropriate attribute in the request. Set `test_mode: true` in API calls to avoid being charged during development.

## Features

### Document Management

Create, retrieve, update, send, and delete documents for electronic signing. The API enables automating online signature requests — you can create, fill out, or send documents for electronic signing. Documents can include multiple files, multiple signers, and multi-step signing workflows. You can also send reminders to recipients, update recipients on pending documents, and download the completed signed PDF.

- Documents can be created from scratch by uploading files and defining fields, or from pre-built templates.
- Signing order can be configured for sequential workflows.
- A `test_mode` flag is available for development without incurring charges.

### Template Management

Create reusable document templates with pre-defined fields and placeholder recipients. Create reusable templates and pre-fill fields to save time and eliminate manual steps. Templates can be retrieved, updated, and deleted via the API. Documents can then be generated from templates with recipient-specific data filled in dynamically.

### Embedded Signing

Instead of directing people to SignWell to sign a document, the embedded signing feature lets users fill out and sign it directly on your website or app. The API returns an `embedded_signing_url` that can be displayed in an iFrame using SignWell's JavaScript library. Events like `completed` and `closed` can be listened to in the iFrame.

### Embedded Requesting

Allow users within your application to create and configure documents or templates through an embedded iFrame, rather than using the SignWell dashboard directly. This lets end-users design signing workflows from within your product.

### Bulk Send

Send a single template-based document to many recipients at once. You can create a bulk send job using a CSV file of recipient data. The API provides endpoints to get a CSV template, validate a CSV before sending, and retrieve the status and individual documents of a bulk send job.

### Text Tags

Define document fields using text-based tags embedded directly in the uploaded document content. This allows programmatic placement of signature, date, text, checkbox, and other field types without manually positioning them via coordinates. Text tags support variables for dynamic content.

### API Applications (White-Label)

The signing experience is fully customizable to match your brand, from look-and-feel to workflow. API Applications allow you to configure branding and settings for embedded signing experiences.

### Regional Compliance

For documents signed in Mexico, SignWell supports retrieving a NOM-151 certificate for regulatory compliance.

## Events

SignWell supports webhooks for real-time event notifications. You can register a callback URL that SignWell will post document events to. Webhook payloads can be verified using event hash verification to ensure authenticity.

### Document Lifecycle Events

The API statuses align directly with API events, which you can subscribe to via webhooks. Whenever one of these events occurs, you'll receive a notification that matches the status transitions of the document in your account.

The following event types are available:

- **`document_created`** — A document has been created (in draft state).
- **`document_sent`** — A document has been sent or shared with recipients.
- **`document_viewed`** — A recipient has opened/viewed the document.
- **`document_in_progress`** — At least one signer has started signing but the document is not yet complete.
- **`document_signed`** — An individual signer has completed their signature (fires per signer).
- **`document_completed`** — All signers have finished and the document is fully signed.
- **`document_expired`** — The document has expired.
- **`document_canceled`** — The document has been cancelled.
- **`document_declined`** — A recipient has declined to sign.
- **`document_bounced`** — Email delivery to a recipient failed.
- **`document_error`** — An error occurred with the document.

Webhooks are configured at the account level by registering a callback URL. You can list, create, and delete webhooks via the API.
