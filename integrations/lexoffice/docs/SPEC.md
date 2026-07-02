Now let me also check the Partner API authentication details more closely:# Slates Specification for Lexoffice

## Overview

Lexoffice (now rebranded as Lexware Office) is a cloud-based accounting software primarily for the German market. It provides online invoicing, bookkeeping, contact management, and tax preparation features. The API is a REST API that allows pushing and pulling accounting data such as contacts, invoices, vouchers, and related documents.

## Authentication

Lexoffice supports two authentication methods:

### 1. API Key (Public API)

For individual users connecting their own Lexoffice account. Users generate a private API key from the Lexoffice settings page at `https://app.lexware.de/addons/public-api`. The key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer {apiKey}
```

API keys can be configured with specific scopes that define what the integration is permitted to access. Users must ensure the key has the necessary permissions when generating it. Invalidating an API key removes all associated event subscriptions; subscriptions must be recreated after generating a new key.

### 2. OAuth 2.0 / 2.1 (Partner API)

For partner integrations building applications used by multiple Lexoffice customers. The Partner API uses the OAuth 2.0 Authorization Code Grant with support for the Refresh Token Grant.

- **Authorization URL:** `https://app.lexoffice.de/oauth2/authorize`
- **Token URL:** `https://app.lexoffice.de/oauth2/token`
- **Required credentials:** `client_id` and `client_secret` (provided by Lexware to each partner)
- **Grant types:** Authorization Code, Refresh Token
- **PKCE:** Recommended for added security
- The token endpoint uses Basic Authentication with BASE64-encoded `{clientId}:{clientSecret}` in the header
- Access tokens are passed as Bearer tokens: `Authorization: Bearer {accessToken}`
- Revoking a refresh token also deletes all event subscriptions for that connection

**API Base URL:** `https://api.lexware.io` (the legacy `https://api.lexoffice.io` gateway remains available temporarily until December 2025).

## Features

### Contact Management

Create, retrieve, update, and filter contacts (customers and vendors). Contacts can be companies or individual persons, with support for billing/shipping addresses, phone numbers, email addresses, and contact persons. Contacts can be filtered by name, email, number, or role (customer/vendor).

- Contacts can only be created or updated with a maximum of one contact person, one billing address, and one shipping address via the API. Contacts with multiple entries in these fields (created via the UI) cannot be updated through the API.

### Sales Voucher Management (Invoices, Quotations, Order Confirmations, Credit Notes, Delivery Notes, Dunnings)

Create and retrieve sales documents across the full document lifecycle. Documents can be created as drafts or finalized immediately. Sales vouchers support a document chain ("pursue" action) where one document type can be derived from another (e.g., quotation → order confirmation → invoice → credit note).

- Supports net, gross, VAT-free, intra-community supply, reverse charge, and various German-specific tax types.
- Supports XRechnung (German e-invoicing standard for public authorities) and ZUGFeRD formats.
- Documents can be downloaded as PDF or XML (for XRechnung).
- Only EUR currency is supported.
- Maximum of 300 line items per document.
- Closing invoices (Schlussrechnungen) and down payment invoices are read-only via the API.

### Bookkeeping Vouchers

Create, retrieve, and update bookkeeping vouchers (purchase invoices, purchase credit notes, sales invoices, sales credit notes). These are containers for bookkeeping data grouped by tax rate, typically associated with uploaded receipt files.

- Vouchers can be created with status `open` or `unchecked` (awaiting completion).
- File attachments (PDF, images, XML e-invoices) can be uploaded and linked to vouchers.

### Article/Product Management

Create, retrieve, update, delete, and filter articles (products and services). Articles can be referenced in line items of sales vouchers.

- Articles can be filtered by article number, GTIN, or type (product/service).

### File Management

Upload and download files (voucher images, PDFs, XML e-invoices). Uploaded files appear in the "unchecked" folder in Lexoffice for review. Files can also be directly assigned to existing vouchers.

- Supported formats: PDF, JPG, PNG, XML (for e-invoices). Maximum file size: 5 MB.

### Payment Information

Read access to payment status and payment history of vouchers and invoices, including open amounts, payment items, and paid dates.

### Recurring Invoice Templates

Read-only access to recurring invoice templates, including their execution schedule, interval configuration, and status. Invoices deduced from templates reference their template.

### Profile & Configuration

Retrieve organization profile information (company name, tax type, business features, connection details). Access reference data including countries (with tax classifications), payment conditions, posting categories, and print layouts.

### Voucherlist

Query and filter across all voucher types (invoices, credit notes, quotations, order confirmations, delivery notes, bookkeeping vouchers) using a unified list with filtering by type, status, date ranges, contact, and voucher number.

## Events

Lexoffice supports webhooks via event subscriptions. You subscribe by providing an event type and a callback URL. Webhook payloads include the organization ID, event type, resource ID, and event date. Webhook authenticity can be verified using an RSA-SHA512 signature in the `X-Lxo-Signature` header.

If a webhook delivery fails, Lexoffice retries with an escalating strategy: 5 retries over ~5 minutes, then 20 retries at 2-hour intervals. Subscriptions are automatically deleted if the callback URL returns 404 or has DNS issues after retries. A 410 response immediately removes the subscription.

### Article Events

- `article.created` — A new article was created.
- `article.changed` — An article was modified.
- `article.deleted` — An article was deleted.

### Contact Events

- `contact.created` — A new contact was created.
- `contact.changed` — A contact was modified.
- `contact.deleted` — A contact was deleted.

### Invoice Events

- `invoice.created` — A new invoice was created.
- `invoice.changed` — An invoice was modified.
- `invoice.deleted` — An invoice was deleted.
- `invoice.status.changed` — The status of an invoice changed (e.g., draft → open → paid).

### Credit Note Events

- `credit-note.created`, `credit-note.changed`, `credit-note.deleted`, `credit-note.status.changed`

### Quotation Events

- `quotation.created`, `quotation.changed`, `quotation.deleted`, `quotation.status.changed`

### Order Confirmation Events

- `order-confirmation.created`, `order-confirmation.changed`, `order-confirmation.deleted`, `order-confirmation.status.changed`

### Delivery Note Events

- `delivery-note.created`, `delivery-note.changed`, `delivery-note.deleted`, `delivery-note.status.changed`

### Down Payment Invoice Events

- `down-payment-invoice.created`, `down-payment-invoice.changed`, `down-payment-invoice.deleted`, `down-payment-invoice.status.changed`

### Dunning Events

- `dunning.created`, `dunning.changed`, `dunning.deleted`

### Bookkeeping Voucher Events

- `voucher.created` — A new bookkeeping voucher was created (triggered after OCR processing completes for uploaded files).
- `voucher.changed` — A voucher was modified.
- `voucher.deleted` — A voucher was deleted.
- `voucher.status.changed` — The status of a voucher changed.

### Payment Events

- `payment.changed` — Payment status of an invoice, credit note, or bookkeeping voucher changed due to manual payment or transaction assignment.

### Recurring Template Events

- `recurring-template.created`, `recurring-template.changed`, `recurring-template.deleted`

### Token Events

- `token.revoked` — The refresh token (OAuth connection) was revoked/invalidated.
