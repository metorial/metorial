# Slates Specification for PandaDoc

## Overview

PandaDoc is a document automation platform for creating, sending, tracking, and electronically signing documents such as proposals, contracts, and quotes. It provides APIs for programmatic document generation from templates or file uploads, embedded signing experiences, and workflow automation. The platform is SOC 2 certified and compliant with E-SIGN, UETA, HIPAA, and GDPR.

## Authentication

PandaDoc supports two authentication methods:

### API Key Authentication

PandaDoc API supports API Key authentication via headers. Add the following header to all API requests:

```
Authorization: API-Key {{api_key}}
```

To obtain an API key, visit the Dev Center and generate a Sandbox or Production key. Production API keys require approval — you must have an active Enterprise plan to access the Production API. The Sandbox key is available on Enterprise plans, and now also for Business plans when Dev Center is enabled.

### OAuth 2.0 Authentication

Security implementation is based on the final version of The OAuth 2.0 Authorization Framework. Every API request requires an access_token as part of the authentication header. This is a three-step process.

1. Register your application at the Developer Dashboard. You can find client_id in the Developer Dashboard.
2. This is a one-time browser-based request to associate a PandaDoc user with API requests. The authorization URL is `https://app.pandadoc.com/oauth2/authorize` with parameters `client_id`, `redirect_uri`, `scope`, and `response_type=code`.
3. Exchange the authorization code for an access token at `https://app.pandadoc.com/oauth2/access_token`.

Use the OAuth token as a header: `Authorization: Bearer {{oauth_key}}`

Eventually, access_token will expire, and accessing an API method will return 401 unauthorized. Your application needs to refresh the OAuth2 token with the stored refresh_token returned when initially creating an access token.

## Features

### Document Creation and Management

Create documents programmatically from PandaDoc templates (populating them with dynamic data such as tokens, fields, recipients, and pricing), from file uploads (PDF, DOCX), or from publicly available PDF URLs. You can list and filter documents, change document status manually, update document ownership, transfer all documents ownership, send documents, share document links, download documents, and delete documents. Documents can be organized into folders.

- Documents support recipients (signers, approvers, CC), fields, tokens, content placeholders, and pricing tables.
- Document sections (bundles) allow appending additional content to a document after creation.
- Documents can have attachments added and managed.
- Document settings, reminders (automatic and manual), and audit trails are configurable.

### Template Management

Access, create, and modify templates programmatically. Templates can be created from scratch or from file uploads, listed, filtered, updated, and deleted. Template settings (such as notification preferences) can be configured. Templates can be organized into folders. Editing sessions can be created for embedded template editing.

### Electronic Signatures and Embedded Experiences

Fully embed document editing, sending, and signing inside your app. Create embedded editing sessions, embedded sending views, and embedded signing sessions so users never leave your application. Recipients can be managed (added, updated, reassigned, deleted), and signing order can be configured. Identity verification options are available for signers.

### Content Library

Manage reusable content blocks (Content Library Items) that can be appended to documents. Create content library items from the API or from file uploads, list them, and retrieve their details.

### Contacts

Manage a contacts directory — create, list, update, and delete contacts that can be used as document recipients.

### Product Catalog and Quotes

Manage a product catalog with items that can be included in document pricing tables. Create, update, list, and delete catalog items. Quotes within documents can be updated programmatically.

### CRM Linking

Link PandaDoc documents to external CRM objects (e.g., Salesforce opportunities). List documents by linked object, create links, and delete links. This enables tracking which documents are associated with specific CRM records.

### User and Workspace Management

User/Workspace Provisioning is available — create and manage workspaces, create users, add or remove members from workspaces, and generate API keys. This supports multi-tenant setups where each customer or team has its own workspace.

### Forms

List forms available in the workspace. Forms allow external recipients to fill out information that generates PandaDoc documents.

### Notarization

Create and manage notarization requests for documents, and list available notaries. This enables remote online notarization workflows.

### API Logs

Retrieve API request logs for monitoring and debugging integration activity.

## Events

PandaDoc supports webhooks that deliver real-time HTTP POST notifications to your endpoint when events occur in a workspace. Webhooks are assigned to a specific workspace and will be triggered by using both Sandbox and Production API keys. Webhook subscriptions can be created via the Developer Dashboard UI or the API, and you can select which events to subscribe to. Payloads can optionally include fields, tokens, products, and pricing data. Webhook authenticity can be verified using HMAC-SHA256 signature validation with a shared key.

### Document Events

- **Document State Changed** — Fired when a document's status changes (e.g., draft, sent, viewed, waiting for approval, approved, rejected, completed, paid, voided, declined, expired).
- **Document Completed PDF Ready** — Fired when a completed document's PDF has been generated and is available for download.
- **Document Updated** — Fired when a document has been returned to draft status.
- **Recipient Completed** — Fired when an individual recipient has completed their actions on a document (does not mean the entire document is completed). Includes who completed it and when.
- **Document Deleted** — Fired when a document is removed.
- **Document Creation Failed** — Fired when document creation via the API fails (e.g., validation errors).
- **Document Section Added** — Fired when asynchronous creation of a document section is complete.
- **Quote Updated** — Fired when a user saves changes to a quote in the Quote Builder.

### Template Events

- **Template Created** — Fired when a new template is created.
- **Template Updated** — Fired when an existing template is modified (name, roles, sections, etc.).
- **Template Deleted** — Fired when a template is deleted.

### Content Library Events

- **Content Library Item Created** — Fired when a new content library item is created.
- **Content Library Item Creation Failed** — Fired when content library item creation via API fails.
