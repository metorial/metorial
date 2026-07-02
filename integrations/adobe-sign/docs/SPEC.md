Now let me get the full list of webhook events and OAuth scopes:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Adobe Sign

## Overview

Adobe Acrobat Sign (formerly Adobe Sign) is an electronic signature service that allows users to send, sign, track, and manage signature processes for documents. It provides a REST API (v6) for programmatic access to agreement workflows, document management, web forms, and user administration. API access is limited to enterprise and developer tier accounts.

## Authentication

Adobe Sign supports two authentication methods:

### OAuth 2.0 (Primary Method)

Adobe Sign uses the OAuth 2.0 Authorization Code flow to authorize API requests. This is the recommended method for production integrations.

**Setup:**

1. Log in to Adobe Sign as an administrator and navigate to **Acrobat Sign API > API Applications**.
2. Create a new application to obtain an **Application ID (Client ID)** and **Client Secret**.
3. Configure OAuth for the application by specifying a **Redirect URI** and selecting the required **scopes**.

**Endpoints:**

The base URL varies by data center shard (e.g., `na1`, `na2`, `eu1`, `au1`, `jp1`):

- Authorization: `https://secure.<shard>.adobesign.com/public/oauth/v2`
- Token: `https://api.<shard>.adobesign.com/oauth/v2/token`
- Refresh: `https://api.<shard>.adobesign.com/oauth/v2/refresh`
- Revoke: `https://api.<shard>.adobesign.com/oauth/v2/revoke`

**Token Lifetime:**

- Access tokens expire after 1 hour (3600 seconds).
- Refresh tokens expire after 60 days of inactivity but can be used indefinitely if refreshed within that window.

**Scopes:**

Scopes follow the format `<resource>_<action>:<modifier>`, where the modifier can be `self`, `group`, or `account`. Available scope categories include:

- `user_read`, `user_write`, `user_login`
- `agreement_read`, `agreement_write`, `agreement_send`, `agreement_retention`
- `library_read`, `library_write`
- `workflow_read`, `workflow_write`
- `webhook_read`, `webhook_write`, `webhook_retention`
- `acc_imp` (for account-level impersonation, must be enabled by Adobe)

Example scope parameter: `agreement_send:group+agreement_read:group+user_login:self`

### Integration Key (Development/Testing Only)

An integration key is a non-expiring access token that can be generated in the Adobe Sign admin UI. It is used as a Bearer token in the `Authorization` header. This method is intended for development, QA, and testing purposes only — not for production use.

**Important:** Before making API calls, the application should retrieve the correct base URL for the user's account via the API, as the base URL can change between sessions depending on the data center.

## Features

### Agreement Management

Create, send, track, and manage agreements (documents sent for signature). Agreements support sequential and parallel signing workflows, multiple recipient roles (signer, approver, acceptor, form filler, certified recipient, delegator), and customizable authentication methods per recipient (password, phone, KBA, email OTP, digital identity). Agreements can be created in a draft state for incremental assembly before sending. Documents must first be uploaded as transient documents (valid for 7 days) before being referenced in an agreement.

### Document Upload (Transient Documents)

Upload files (PDF, DOC, DOCX, etc.) to Adobe Sign servers as transient documents. These are temporary files assigned an ID that can be referenced when creating agreements, web forms, or library templates. Documents cannot be directly embedded in agreement creation calls.

### Library Templates

Create and manage reusable document templates with pre-configured form fields. Templates can be shared at the user, group, or account level and used as the basis for agreements, reducing repetitive setup.

### Web Forms (Widgets)

Create embeddable, publicly accessible signing forms that can be hosted on websites. Web forms generate unique URLs or JavaScript embed codes. Each time a participant fills in a web form, a new agreement is generated. Web forms can be enabled, disabled, and modified.

### Send in Bulk (MegaSign)

Send the same agreement to a large number of recipients simultaneously, each receiving a personalized signing experience. This is useful for scenarios like mass onboarding, policy acknowledgments, or form collection.

### Form Field Management

Add and manage form fields on documents using text tags within PDF content, the authoring environment (drag-and-drop), or AcroForms. Supports field types including signatures, initials, text, dates, checkboxes, radio buttons, dropdowns, and calculated fields. Fields can have validation rules and conditional visibility.

### Reminders

Programmatically send reminders to participants who have not yet completed their actions on agreements. Reminders can be configured with specific frequencies and delays.

### Audit Trails

Download detailed audit reports for any agreement, capturing the complete history of events including creation, viewing, signing, delegation, and authentication actions.

### User Management

Retrieve and manage users within an account. Supports listing users, viewing user details, and managing group memberships. Administrators can act on behalf of other users via the `x-api-user` header (impersonation).

### Embedded Signing

Generate signing URLs that can be embedded within your application (via iframes or hosted pages), allowing signers to complete the process without leaving your application.

### Reporting and Data Export

Retrieve agreement data and form field values programmatically. Export field data from completed agreements for downstream processing.

## Events

Adobe Sign supports webhooks that deliver real-time HTTPS POST notifications with JSON payloads when events occur. Webhooks can be created via the API or the admin UI.

**Webhook Scopes:** Webhooks can be scoped to Account, Group, User, or a specific Resource (individual agreement, web form, etc.). Only one scope per webhook.

**Verification:** When registering a webhook, Adobe Sign sends a GET request to the webhook URL with an `X-AdobeSign-ClientId` header. The URL must respond with a 2XX status and echo back the client ID to confirm intent.

**Notification Parameters:** Webhook payloads can be customized to include or exclude specific data sections (agreement info, document info, participant info, signed document) to reduce payload size.

### Agreement Events

Notifications related to the lifecycle of agreements. Includes events for:

- Agreement created, sent, expired, canceled, rejected, deleted
- Participant action completed (signed, approved, etc.)
- Full workflow completed (all parties done)
- Agreement delegated, participant replaced
- Agreement modified and modification acknowledged
- Email/WhatsApp/SMS bounced, email viewed, document viewed
- Reminder sent and initiated
- KBA, email OTP, and social identity authentication events
- Agreement vaulted, offline sync, expiration updated, signer name changed
- Use `AGREEMENT_ALL` to subscribe to all agreement events including future ones

### Send in Bulk (MegaSign) Events

Notifications related to bulk send operations. Includes events for:

- Send in Bulk created, shared, recalled
- Reminder sent and initiated
- Use `MEGASIGN_ALL` to subscribe to all bulk send events

### Web Form (Widget) Events

Notifications related to web form lifecycle. Includes events for:

- Web form created, enabled, disabled, modified, shared
- Web form creation failed
- Use `WIDGET_ALL` to subscribe to all web form events

### Library Template Events (API Only)

Notifications related to library document templates. Only available via API (not in the admin UI). Includes events for:

- Library document created, modified, creation failed
- Use `LIBRARY_DOCUMENT_ALL` to subscribe to all library template events
