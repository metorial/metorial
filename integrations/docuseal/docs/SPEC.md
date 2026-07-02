Let me get more details on the webhook event types and the API authentication.# Slates Specification for DocuSeal

## Overview

DocuSeal is an open-source electronic document signing and management platform. It allows creating fillable document templates from PDF, DOCX, or HTML, sending them for signature to one or multiple parties, and retrieving completed signed documents. It is available as a cloud service (US and EU regions) or self-hosted on-premises.

## Authentication

DocuSeal uses API key authentication. The API key is passed in the `X-Auth-Token` HTTP header with every request.

- **Obtaining the key**: API keys can be retrieved from the DocuSeal console. There are separate consoles depending on deployment:
  - **US Cloud**: `https://console.docuseal.com/api`
  - **EU Cloud**: `https://console.docuseal.eu/api`
  - **On-premises**: From your self-hosted instance's settings.

- **Base URLs**:
  - US Cloud: `https://api.docuseal.com`
  - EU Cloud: `https://api.docuseal.eu`
  - On-premises: Your custom instance URL.

- **Usage**: Include the header `X-Auth-Token: <your_api_key>` in all API requests.

- **Requirements**: API and embedding features require a Pro Plan subscription (at least one Pro seat).

There is no OAuth2 flow or scopes; authentication is solely via the static API key.

## Features

### Template Management

Create, retrieve, update, clone, merge, and archive reusable document templates. Templates define the document layout and the fillable fields (signature, text, date, initials, checkboxes, etc.) that submitters must complete. Templates can be created programmatically from PDF files (using embedded text field tags or pixel coordinates), Word DOCX files (with text tags or dynamic content variables), or HTML content with special field tags. Templates can be organized into folders, shared via public links, and assigned an external ID for mapping to external systems. Template documents can be individually added, replaced, or removed after creation.

### Submission Management

Create signature requests (submissions) based on templates and send them to one or more submitters (signers). Submissions can be initiated by referencing an existing template or by providing a one-off PDF, DOCX, or HTML document inline. Key options include:

- **Signing order**: Preserved (sequential) or random (parallel).
- **Notification**: Signature requests sent via email or SMS; email sending can be disabled per submission or per submitter.
- **Pre-filling fields**: Default values can be set for fields, optionally marked as read-only.
- **Expiration**: Submissions can have an expiration date after which they become unavailable.
- **Custom messaging**: Email subject and body can be customized with template variables.
- **Redirect URL**: Submitters can be redirected to a custom URL after completion.
- **BCC**: Completed signed documents can be BCC'd to a specified email address.
- **Two-factor authentication**: Phone or email 2FA can be required for individual submitters.
- **Auto-signing**: A submitter can be marked as completed programmatically to automate counter-signing.
- **Dynamic content variables**: For DOCX and HTML templates, dynamic variables (strings, numbers, arrays, objects, HTML) can be injected at submission time.
- **Document merging**: Multiple documents can be merged into a single PDF.

Submissions can be listed and filtered by template, status (pending, completed, declined, expired), submitter name/email/phone, folder, and slug. Submissions can be archived.

### Submitter Management

Retrieve and update individual submitters (signers) associated with a submission. Submitter details include status, filled values, signed documents with download URLs, and submission event history (e.g., form viewed, form started, form completed). Submitters can be filtered by submission, external ID, completion date range, or search query. Updating a submitter allows changing their email, name, phone, pre-filled field values, and re-sending notification emails or SMS.

### Signed Document Retrieval

Download completed signed documents as PDF files. Each submitter's response includes URLs to their signed documents. Submission-level document retrieval can optionally merge all documents into a single PDF. Audit log URLs and combined document URLs (documents + audit log) are also available upon full completion.

### Field Types

Templates support a wide range of field types: text, signature, initials, date, number, image, checkbox, multiple select, file upload, radio buttons, select dropdowns, cells, stamp, payment, phone, verification, knowledge-based authentication (KBA), and strikethrough. Fields can have validation rules (pattern, min/max), formatting preferences (font size, type, color, alignment), and can be configured as required or optional.

## Events

DocuSeal supports webhooks for real-time event notifications. Webhook URLs are configured in the DocuSeal console (`https://console.docuseal.com/webhooks`). A secret key-value pair can be added to webhook configurations, which is included in request headers for verification. Failed webhook deliveries are automatically retried.

### Form Events

Events related to individual submitter (signer) activity on a signing form:

- **form.viewed**: Triggered when a submitter first opens the signing form.
- **form.started**: Triggered when a submitter begins filling out the form.
- **form.completed**: Triggered when a submitter successfully completes and signs the form. Includes filled field values, signed document URLs, and audit log URL.
- **form.declined**: Triggered when a submitter declines the submission. Includes the decline reason.

The payload includes submitter details (email, name, role, external ID, IP, user agent), submission metadata, template info, filled values, and document download URLs.

### Submission Events

Events related to the overall submission lifecycle (across all signing parties):

- **submission.created**: Triggered when a new submission is created.
- **submission.completed**: Triggered when all signing parties have completed the submission.
- **submission.expired**: Triggered when a submission expires.
- **submission.archived**: Triggered when a submission is archived.

The payload includes full submission details with all submitters, their statuses, values, documents, template information, submission events log, and audit log URLs.

### Template Events

Events related to template lifecycle changes:

- **template.created**: Triggered when a new template is created.
- **template.updated**: Triggered when a template is modified.

The payload includes template details such as name, fields, submitter roles, documents, folder, and author information.
