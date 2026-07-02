Now let me check the V2 API reference for a complete picture of features:I now have enough information to write the specification. Let me compile it.

# Slates Specification for Documenso

## Overview

Documenso is an open-source document signing platform that enables users to create, send, and manage legally binding electronic signatures on PDF documents. It supports multi-document envelopes, reusable templates, recipient management, and team collaboration. It can be self-hosted or used as a cloud service.

## Authentication

Documenso uses API keys for authentication. An API key is a unique token that is generated for each client.

**Creating an API Key:**
To create an API key, navigate to the user settings page. Click on your avatar in the top right corner of the dashboard and select "Team Settings" from the dropdown menu. Once you're on the settings page, navigate to the API Tokens tab. This page lists your existing keys and enables you to create new ones.

You can set the key never to expire or choose when to become invalid: 7 days, 1 month, 3 months, 6 months, or 1 year.

**Using the API Key:**
You must include the API key in the Authorization request header to authenticate your API requests. The format is `Authorization: api_xxxxxxxxxxxxxxxx`.

Note: There is no OAuth2 support. The API key has access to your account and all its resources. There are no granular scopes.

**Base URL:** `https://app.documenso.com/api/v2/`

## Features

### Document & Envelope Management

The API allows retrieving, uploading, deleting, and sending documents for signing. Documenso has introduced an Envelopes API. Envelopes are the natural progression of documents and templates, designed to simplify multi-document signing workflows. An envelope can contain one or more PDF files, recipients, and signature fields, and can be created and sent in a single API call.

- Documents can be organized into folders.
- Documents support metadata such as subject, message, timezone, date format, redirect URL after signing, and language settings.
- Documents can be distributed via email or direct link.
- Signing order can be parallel or sequential.

### Recipient Management

You can manage document recipients and signers. Recipients can be assigned roles including SIGNER, VIEWER, APPROVER, and CC. Each recipient can have a configurable signing order. Recipients support authentication options for access and action authorization.

### Field Management

You can add and configure signature fields. Supported field types include signature, email, name, date, text, number, and checkbox. Fields are positioned on specific pages with configurable coordinates, dimensions, and metadata (label, placeholder, required, read-only, font size, text alignment). Fields can be prefilled with values.

### Templates

You can work with document templates. Create reusable document templates for easy customization and rapid deployment. Templates support direct links — shareable URLs that allow recipients to sign without the sender knowing their email in advance. Recipients can open the link, enter their information, and sign the document. Documents can be programmatically generated from templates with custom recipient details and prefilled fields.

### Team Management

You can manage teams and team members. Teams provide a shared workspace for documents, templates, and webhooks. Organisations are the top-level structure in Documenso, designed to manage multiple teams and users under one entity. They provide centralized billing, access control, and unified settings across your workspace.

### Embedding

Documenso offers embedded signing, which lets you embed the signing experience in your application. Your users sign documents without leaving your site. Embedded authoring lets you embed document and template creation and editing in your application. Embedding works through presign tokens obtained via the API, with SDKs available for React, Vue, Svelte, Angular, Solid, Preact, and Web Components.

### Folder Management

The API V2 includes full folder management capabilities, allowing developers to create, organize, and manage documents within folders programmatically. API V1 and V2 now support creating documents directly inside folders. This makes it easier to organize documents at the time of creation.

## Events

Documenso supports webhooks for real-time event notifications. Webhooks are HTTP callbacks triggered by specific events. When you subscribe to a specific event and that event occurs, the webhook makes an HTTP request to the URL you provide. The request can be a simple notification or carry a payload with more information about the event.

Webhooks are configured per team (not available for individual/personal accounts).

### Document Lifecycle Events

The following events can be subscribed to: `document.created`, `document.sent`, `document.opened`, `document.signed`, `document.completed`, `document.rejected`, `document.cancelled`.

- **document.created** — Fired when a new document is created (status: DRAFT).
- **document.sent** — Fired when a document is distributed to recipients for signing.
- **document.opened** — Fired when a recipient opens a document.
- **document.signed** — Fired when a recipient signs a document.
- **document.completed** — Fired when all recipients have completed signing.
- **document.rejected** — Fired when a recipient rejects a document, includes rejection reason.
- **document.cancelled** — Fired when the document owner cancels a pending document.

Each webhook payload includes full document details, metadata, and recipient information (status, signing order, role, etc.).

**Configuration options:**

- Webhook URL that will receive the event payload.
- Selection of specific events to subscribe to.
- Optionally, you can provide a secret key that will be used to sign the payload. This key will be included in the `X-Documenso-Secret` header of the request.
- Webhook calls can be tested with sample data and resent from the dashboard.
