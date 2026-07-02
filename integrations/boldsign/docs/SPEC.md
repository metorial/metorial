Now let me get the available webhook events list:Now I have enough information to compile the specification. Let me also check for template-related webhook events, as some were mentioned (TemplateCreated, TemplateCreateFailed, SendFailed).

# Slates Specification for Boldsign

## Overview

BoldSign is an electronic signature platform by Syncfusion that provides APIs for sending, signing, tracking, and managing documents. It supports embedded signing experiences, reusable templates, identity verification, branding, and team/user management. The API base URL is `https://api.boldsign.com` for the US region, with region-specific URLs available (e.g., `https://eu-api.boldsign.com` for EU).

## Authentication

BoldSign supports two authentication methods:

### 1. API Key

- An easy alternative to OAuth for connecting to and authenticating BoldSign's API services.
- To make an HTTP request with API Key, the request header must include the `X-API-KEY`.
- Example: `X-API-KEY: {your API key}`
- You can generate up to 4 API keys at once. The generated API keys can be either in the Live or Sandbox environment but no more than 2 in a single environment.
- By default, all the scopes will be included when you generate an API key. Currently, this is not customizable.
- API keys can have an optional expiry date. If no expiry date is set, the API key will remain valid until it is manually deleted.

### 2. OAuth 2.0

- OAuth2 is a protocol allowing applications to authenticate with the BoldSign API, and the security implementation is based on the OpenID Connect framework. To obtain an access token and make calls to the API, you can use any of BoldSign's supported OAuth2 authentication workflows, such as Client Credential or Authorization Code Grant.
- An Implicit flow is also supported for client-side applications.
- **Authorization URL:** `https://account.boldsign.com/connect/authorize`
- **Token URL:** `https://account.boldsign.com/connect/token`
- **Credentials required:** Client ID and Client Secret, obtained by creating an OAuth App in the BoldSign dashboard.
- The access token is passed in the `Authorization: Bearer {token}` header.
- Access tokens expire after 3600 seconds (1 hour). Refresh tokens are supported via the `offline_access` scope, with an optional sliding expiration mode.
- **PKCE** (Proof Key for Code Exchange with S256 challenge method) is supported and used in the Authorization Code flow.

**Known OAuth Scopes:**

- `openid`, `profile`, `email` — standard OIDC scopes
- `offline_access` — for obtaining refresh tokens
- `BoldSign.Documents.All` — access to document operations
- `BoldSign.Templates.All` — access to template operations

**Billing Option:** When creating an OAuth app, you choose whether API usage charges are billed to your account or to the connecting user's account.

## Features

### Document Sending & Signing

Send documents (PDF, Word, etc.) for electronic signature to one or more recipients. It is not mandatory for the signers to have a BoldSign account. The signer can sign a document sent by another user with or without a BoldSign account. Supports self-signing, signing order enforcement, expiry dates, automatic reminders, and CC recipients. Documents can also be sent on behalf of another user (useful for multi-tenant/SaaS use cases).

### Document Management

List, search, and filter documents by status. Retrieve document details and history, download signed documents and audit trails, revoke in-progress documents, extend expiry, send reminders, delete documents, and manage document tags.

### Templates

Create reusable document templates with predefined roles, form fields, and settings. When you need to send the same contracts out for signature to different groups of people repeatedly, you can use templates to save time. Once a template is created, sending contracts using that template takes less than a minute. Templates can be shared with teams, and documents can be created from single or multiple merged templates. Templates support tag management and editing.

### Form Fields & Text Tags

Place signature fields, text boxes, checkboxes, radio buttons, dropdowns, date fields, images, attachments, hyperlinks, labels, and more on documents using coordinate-based positioning. Using the text tag feature, developers can put invisible text in the place of fields, and the BoldSign API will automatically convert those to actual fields before sending. Form fields support prefilling, conditional rules, validation, data syncing, collaborative editing, and custom fonts.

### Embedded Experiences

Embed the document sending, signing, and template creation/editing processes directly within your application using iFrames or popup windows. This includes embedded signing links, embedded request creation (from scratch or from templates), and embedded template management. The embedded UI supports custom branding and locale settings.

### Signer Authentication

Require signers to verify their identity before accessing documents. Supported authentication methods include access codes, Email OTP, and SMS OTP. Authentication can be added or removed after a document has been sent.

### Identity Verification

Verify signer identities using ID document verification. Retrieve verification reports and images, and optionally prefill form fields using verified data. Supports an embedded manual verification flow and a sandbox mode for testing.

### Branding

Customize the appearance for your signers by incorporating your brand's logo, colors, and legal terms. You can also add and manage multiple brands within a single account and select the appropriate brand before sending each document.

### Sender Identities

Create and manage sender identities to send documents on behalf of other users. Identities require approval from the target user. You can list, update, delete, and resend invitations for identities.

### Users & Teams

Create and manage users within your organization, assign roles, update metadata, transfer users between teams, and resend or cancel invitations. Create and manage teams with configurable settings.

### Contacts & Contact Groups

Manage a contact book of signers and organize them into groups for easier document distribution.

### Custom Fields

Create organization-level custom form fields that can be reused across documents and templates. Supports embedded creation via URL.

### Audit Trail

Track every action taken on a document with a detailed, tamper-proof audit log for full transparency. Audit trails can be downloaded separately or combined with the signed document.

## Events

BoldSign supports webhooks for real-time event notifications. BoldSign supports two types of webhooks: App-Level and Account-Level. App-Level Webhooks trigger events for documents sent using a specific OAuth application. They are tied directly to the OAuth app, ensuring precise event tracking for that application. Account-Level Webhooks trigger events for all documents across the account (web app and API). You can subscribe to individual events or all events. Webhook payloads are signed with HMAC-SHA256 for verification.

Optionally, you can enable "Listen to Team user's events" to receive notifications for events triggered by team members.

### Document Lifecycle Events

- **Sent**: Triggered when a document has been successfully created and sent for signature.
- **SendFailed**: Triggered when document sending fails during async processing.
- **Signed**: Triggered when one of the signers has completed signing their portion.
- **Completed**: Triggered when all recipients have completed signing.
- **Declined**: Triggered when a signer declines the document.
- **Revoked**: Triggered when the sender revokes/cancels the document.
- **Reassigned**: Triggered when a signer reassigns the document to another person.
- **Expired**: Triggered when the document's signing period has expired.
- **Viewed**: Triggered when a document is viewed by a recipient.
- **Edited**: Triggered when a document is edited.

### Authentication & Delivery Events

- **Authentication Failed**: Triggered when a signer fails identity authentication when trying to access a document.
- **Delivery Failed**: Triggered when email delivery fails for a recipient.

### Identity Verification Events

- **Identity Verification Initiated**: Triggered when an identity verification process is started.

### Template Events

- **TemplateCreated**: Triggered when a template is successfully created.
- **TemplateCreateFailed**: Triggered when template creation fails during async processing.
- **Template Edited**: Triggered when a template is edited.
