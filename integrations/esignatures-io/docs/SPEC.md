Let me get more details on the full API docs, especially webhook event types and template/contract features.# Slates Specification for eSignatures.io

## Overview

eSignatures.io (now eSignatures.com) is a mobile-first electronic signature platform for creating, sending, and signing legally binding contracts online. It provides a REST API for programmatic contract management, template creation, and real-time status tracking via webhooks. Contracts comply with U.S. ESIGN Act, EU eIDAS, and other international electronic signature regulations.

## Authentication

eSignatures.io uses a **Secret Token** (API key) for authentication. There are two supported methods:

1. **Token as URL parameter**: Append your secret token as a query parameter to any API request:

   ```
   https://esignatures.com/api/<action>?token=your-secret-token
   ```

2. **HTTP Basic Auth**: Use your Secret Token as the username with no password.

You can locate your Secret Token on the API page after logging into your eSignatures account. The token is found under API/Automation settings in the top-right corner of the dashboard.

API requests made from browsers will trigger a CORS error to protect your Secret Token. The token should only be used server-side.

## Features

### Contract Management

Create contracts from templates with a single API call. Contracts can be fully managed through the API. Key options include:

- **Template-based creation**: Contracts are generated from pre-built templates, with placeholder fields for dynamic content (e.g., names, dates, terms).
- **Signers**: Define one or more signers with name, email, mobile number, company name, and signing order. Signers can be added, updated, or removed after contract creation.
- **Delivery methods**: Signature requests can be sent via email, SMS, or both. Delivery of the final signed document can also be configured per signer.
- **Multi-factor authentication**: Supports SMS verification codes, email verification codes, and photo ID verification for signer identity.
- **Expiration**: Contracts can be set to expire after a configurable number of hours.
- **Custom emails**: Subject lines and body text for signature request and final contract emails can be customized, with dynamic name insertion.
- **CC recipients**: Additional email addresses can be CC'd on the signed PDF.
- **Labels and metadata**: Contracts can be tagged with custom labels and metadata for organization.
- **Custom branding**: White-label the signing flow with a custom company name and logo.
- **Draft mode**: Contracts can be saved as drafts for editing in the UI before sending.
- **Auto-sign**: A signer (typically the sender) can be set to auto-sign.
- **Redirect after signing**: Signers can be redirected to a custom URL after signing.
- **Withdraw**: Contracts can be withdrawn to prevent further signing. Withdrawn contracts retain their data.
- **PDF preview**: Generate a PDF preview of a contract before it is signed.
- **Query**: Retrieve contract details including status, signer information, and signer-entered field values. The signed PDF URL is available after all parties have signed.

### Template Management

Create, update, copy, query, list, and delete contract templates via the API. Templates define the document structure using `document_elements`, which support:

- Headers (three levels), formatted text (bold, italic, underline), ordered/unordered lists
- Signer input fields: text, text area, date, dropdown, checkbox, radio button, file upload — each assignable to specific signers
- Images (base64-encoded), tables, and embedded sub-templates
- Placeholder fields for dynamic content injection at contract creation time

Templates can be copied between accounts (including to other accounts using a target API key), with placeholder customization during the copy.

### Template Collaborators

Invite external collaborators to edit a template via a shareable editor URL. The editor link can be embedded in an iframe. Collaborators can be listed and removed.

### Embedded Signing

The signing page can be embedded directly into your application using an iframe. The sign page URL is returned when creating a contract. Append `?embedded=yes` to enable embedded mode. Supports iframe auto-resizing and in-iframe redirects after signing.

### Signer Fields

Templates can include fields that signers must fill in during the signing process (text, dropdowns, checkboxes, dates, file uploads, etc.). Fields can be assigned to specific signers, marked as required or optional, pre-filled with default values, and configured as masked/confidential.

## Events

eSignatures.io supports **webhooks** for real-time event notifications. Webhooks allow you to receive real-time notifications for specific events, such as when a contract is signed. When an event occurs, a POST request is sent to the Webhook URL specified in your API dashboard. A custom webhook URL can also be specified per contract. Each request includes an X-Signature-SHA256 header with an HMAC-SHA256 signature of the request body, generated using your secret token, for secure verification.

### Contract Events

- **Contract Sent to Signer**: Triggered when a contract is sent to a signer for signature. Includes signer and contract details.
- **Contract Reminder Sent to Signer**: Triggered when a reminder is sent to a signer.
- **Contract Signed**: Triggered when all signers have signed the contract. Includes a URL to download the signed PDF and all signer field values.
- **Contract Withdrawn**: Triggered when a contract is withdrawn or a signer declines to sign.
- **Contract PDF Generated**: Triggered when a PDF preview has been generated (via the PDF preview API).

### Signer Events

- **Signer Viewed the Contract**: Triggered the first time a signer views the contract.
- **Signer Signed the Contract**: Triggered when an individual signer signs (as opposed to the contract-level "all signed" event). Includes signer field values.
- **Signer Declined the Signature**: Triggered when a signer declines to sign. Includes the decline reason if provided.
- **Signer Requested Mobile Number Update**: Triggered when a signer requests to change their mobile number.
- **Signer SMS Received**: Triggered when a signer replies to an SMS from eSignatures.

### Error Events

- **Webhook Error Notifications**: Triggered on delivery failures such as `email-delivery-failed` or `sms-delivery-failed`. Includes error code, message, and contract metadata.
