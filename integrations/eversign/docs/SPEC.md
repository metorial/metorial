# Slates Specification for Eversign

## Overview

Eversign (now branded as Xodo Sign) is an electronic signature platform that allows users to create, send, sign, and manage legally binding documents online. It provides a RESTful API for automating document signature workflows, including template management, embedded signing, and bulk sending capabilities.

## Authentication

Eversign supports two authentication methods:

### 1. API Access Key

Each Eversign account comes with a unique API access key, used to authenticate with the API. You can find your API access key by navigating to the top left dropdown menu and selecting "Developer".

To authenticate, append the `access_key` GET parameter to the API's base URL: `https://api.eversign.com/document?access_key=YOUR_ACCESS_KEY`. Each API request should also carry the `business_id` GET parameter within the request URL.

There is also a way of requesting the API to list all existing businesses for your account. To select a business for your API request, append the `business_id` parameter and set it to your Business ID.

### 2. OAuth 2.0

Using OAuth you can make requests to the API on behalf of other Eversign users. You must set up and register an app within your Eversign account. Once approved, anyone using your app can connect it to their Eversign account, granting authorization to perform actions on their behalf.

**OAuth Flow:**

1. Register an app in the Developer page, providing an app name, domain, OAuth callback URL, and optional webhook URL.
2. Upon approval, you receive a **Client ID** and **Client Secret**.
3. Redirect users to the authorization URL: `https://app.eversign.com/oauth/authorize?client_id=YOUR_CLIENT_ID&state=YOUR_STATE_VALUE`
4. After user authorization, exchange the returned `code` for an access token via a POST request to `https://app.eversign.com/oauth/token` with `client_id`, `client_secret`, `code`, and `state` parameters.
5. The response includes a Bearer `access_token`. Tokens currently do not expire.
6. Use the token as a `Bearer` HTTP Authorization header instead of the `access_key` parameter.

**Important:** OAuth access is scoped to documents created through your OAuth app only. You cannot access documents created by the user independently.

## Features

### Document Management

Create, retrieve, list, cancel, delete, and trash documents. Documents can be sent to one or more signers with configurable signing order. Document files can be uploaded by providing a URL, a reference to an existing file ID, or through a base64 string. Documents support custom metadata, expiration dates, and localization (language per signer).

### Templates

Create reusable templates with predefined fields and signer roles. Documents can be created from templates by specifying a template ID and filling in signer roles with actual recipients. Templates support the same field types as documents.

### Document Fields

Documents and templates support various field types including: signature, initials, date signed, text, note (multi-line), checkbox, radio buttons, dropdown, and attachment fields. Fields are positioned on specific pages with configurable styling (font, size, color) and validation options. Fields can be marked as required or read-only.

### Embedded Signing

Embedded signing enables signers to sign documents directly on your website using an iFrame. All you need is your API Access Key, a server-side signature request, and the JavaScript library for the client side. When creating or fetching a document with embedded signing enabled, the API returns unique embedded signing URLs per signer.

### Embedded Requesting

Allows embedding the document preparation (field placement) interface within your own application, enabling end-users to prepare documents for signature without leaving your platform.

### Bulk Sending

Bulk sending endpoints can be used to send multiple documents based on a specific template. The feature is based on providing a CSV template containing data about documents that should be created, structured according to the template being used. You can create bulk jobs, validate CSV files, and track bulk job status and resulting documents.

### File Management

Upload files for use in documents via multipart/form-data requests. Files are retained for a maximum of 30 days if not referenced in a document. Files used in documents are retained as part of that document.

### Document Download

Download documents in their original (raw) or final (completed) state as PDF. When downloading a final document, you can optionally attach the document's Audit Trail.

### Signer Management

Send reminders to individual signers who haven't yet signed. Reassign signing responsibility from one signer to another, with email notifications sent to the document owner and both old and new signers. Signers can be authenticated via SMS for identity verification.

### Audit Log

Access audit trail information for documents, providing a detailed log of all actions taken on a document.

### Sandbox Mode

Sandbox mode can be enabled for non-production testing. Documents created in Sandbox Mode come with a testing prefix and are not legally binding.

## Events

Eversign supports webhooks for real-time event notifications. There are two types of event callbacks: Account-based callbacks and App-based callbacks.

- **Account-based callbacks**: Activated by entering a webhook URL in the Developer page settings. All document events across all businesses will be reported to this URL, including events from the control panel, embedded flows, and documents sent via the API.
- **App-based callbacks**: A webhook URL can be specified per registered OAuth app. All document events related to documents created using that app will be reported to its URL.

### Document Lifecycle Events

Events covering the full lifecycle of a document:

- **document_created** – A document has been created.
- **document_sent** – A document has been sent to a signer.
- **document_viewed** – A document has been viewed by a signer.
- **document_signed** – A document has been signed by one of its signers.
- **document_completed** – All required signers have signed the document.
- **document_declined** – A signer has declined the document.
- **document_forwarded** – A signer has forwarded the document.
- **document_expired** – The document expired without all required signatures.
- **document_revoked** – The document has been canceled by the owner.
- **document_cancelled** – Triggered automatically after cancellation-causing events (e.g., revocation or signer bounce).

### Signer Events

Events related to individual signers:

- **signer_removed** – A signer has been removed from the document.
- **signer_bounced** – The document could not be delivered to a signer.
- **email_validation_waived** – Email validation has been disabled for a document (in-person or embedded signing).

Each webhook payload includes event metadata (timestamp, event type, related document hash, user ID, business ID, app ID) and signer information (name, email, role, order). Events can be validated using an HMAC-SHA256 hash computed with your API key.
