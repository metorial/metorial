# Slates Specification for Oksign

## Overview

OKSign (oksign.be) is a Belgian electronic signature platform by Betrust that allows uploading PDF or Word documents, defining signature fields, and collecting legally binding signatures via multiple methods including eID, itsme, SMS (TAN), Smart-ID, and pen (touchscreen scribble). It supports simple, advanced, and qualified electronic signatures compliant with the EU eIDAS regulation.

## Authentication

OKSign uses API key-based authentication. The API key is passed as a custom HTTP header called `x-oksign-authorization`. The header value is a combination of three parts separated by semicolons:

1. **Account number** – Your OKSign account number
2. **Authentication token** – A UUID-style token generated in your account
3. **Organizational token** – A label/name for the token (e.g., "marketing", "sales")

Format: `x-oksign-authorization = {accountnumber};{auth-token};{org-token}`

Example: `x-oksign-authorization = 100693;463204-5BC1F362-85AD-34A3-9DB5-DC891D20979E;marketing`

Organizational tokens (API keys) are created and managed in your OKSign account under the menu item `REST API` → `API Console`.

Each API key can optionally be linked to a `callbackURL`, `returnURL`, and `webhookURL`. These URLs can also be updated programmatically via the API.

## Features

### Document Upload & Management

Upload PDF or Word documents to the OKSign platform for signing. Word documents are automatically converted to PDF upon upload. You can check if a document exists, retrieve it, or remove it from the platform. Documents are automatically removed once all signatures are collected, or can be manually removed. Maximum file size is 10 MB.

### Form Descriptor & Field Configuration

Define form fields on uploaded documents, including signature boxes, text fields, text areas, select dropdowns, date fields, and checkboxes. Fields can be positioned using exact coordinates or text markers embedded in the document. A "stealth mode" allows signatures to be automatically placed on a separate appended page when the document layout is unknown. Fields can be prefilled and set as read-only or editable. Validation rules can be applied to text fields (e.g., email, phone, IBAN).

### Signature Collection

Collect signatures from one or more signers using five signing options per signature field: Belgian eID card, itsme (Qualified Electronic Signature), SMS/TAN code, Smart-ID, and pen/scribble on touchscreen. Each signing option can be enabled or disabled per signature field. Signatures can be collected in a specific order using email/SMS workflows. Teammembers (account users) can be assigned as countersigners with automatic countersignatures.

### Notifications (Email & SMS)

Send email and/or SMS notifications to signers informing them that a document is ready for signing. Notifications support configurable subject, body (HTML for email), language (nl, fr, en, da, de, pl, es, it, pt), reminders (interval in days), and repeat count. Notifications can be resent at any time. Email attachments of various types (PDF, Word, Excel, images, etc.) can be included with notification emails.

### Briefcase (Document Bundling)

Bundle multiple documents together so that signers can sign all documents using a single signing link. Each briefcase can have a custom package name displayed during the signing process. Supports callback, return, and webhook URLs.

### SignExpress (Embedded Signing)

Embed a "Sign now" button in your own application for an end-to-end face-to-face signing flow. Creates a time-limited signing URL for a specific signer and set of documents. The validity period is configurable (default 90 days). Supports callback and return URLs.

### EditorExpress (Embedded Document Editor)

Embed the OKSign document editor in your own application, allowing users to interactively add and position signature and form fields on a document. After editing, the updated form descriptor can be retrieved and used in the standard signing flow. Supports showing/hiding anonymous signers, team members, and signing options.

### Document Metadata & Audit Trail

Retrieve metadata from signed documents including signature details (who signed, when, authentication method, signer identity), field values, and document status. An Audit Trail report (PDF) provides certified proof of all actions performed on a document — access, review, and signatures — with timestamps and document hash verification. Audit trails are available for up to 18 months after upload.

### Contacts Management

Manage a contacts list within your OKSign account. Contacts can be added, updated, retrieved, and removed. Each contact has a name, email, optional mobile number, role/capacity, and group assignment. The contact list can be fully replaced or incrementally updated. Contacts are uniquely identified by the combination of email and name.

### Account Information

Retrieve account credit balance, storage usage, and subscription details. List all users (team members) in the account with their roles, signer IDs, and status. Retrieve email templates defined in the account for use in notifications. Look up the linked source/signed document ID pairs.

### API Token Configuration

Programmatically update the callback URL, return URL, and webhook URL linked to an organizational token (API key).

## Events

OKSign supports two event mechanisms:

### Callback URL (Webhook on Signature)

When a document is signed, OKSign calls the configured `callbackURL` via HTTP GET, providing parameters including the source document ID, signed document ID, completed fields, number of signatures required vs. placed, signing method details, and credits consumed. This fires each time a signature is applied to a document. The callback URL can be configured per organizational token or per Briefcase/SignExpress session.

### Webhook URL (Notification Delivery Errors)

When an email or SMS notification fails to deliver (e.g., bounce, blocked, invalid email, deferred), OKSign calls the configured `webhookURL` via HTTP GET with error details including the event type (hard_bounce, soft_bounce, blocked, spam, invalid_email, deferred), the affected email/mobile, the related document ID, and a human-readable error reason.

### Polling Mechanisms

OKSign also provides two purpose-built polling endpoints as alternatives to the callback and webhook URLs:

- **Documents.signed polling**: Retrieve a list of documents signed within a specified time window.
- **Webhooks.retrieve polling**: Retrieve notification delivery errors within a specified time window.
