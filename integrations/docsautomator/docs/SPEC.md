Now let me check for more details on the API, especially around e-signatures and the webhook/output settings.Now I have enough information to write the specification.

# Slates Specification for Docsautomator

## Overview

DocsAutomator is a document automation platform that generates PDFs and Google Docs from data using Google Docs or PDF templates with placeholder-based data mapping. It is a flexible no-code document automation tool based on Google Docs that natively integrates with data sources like Airtable, Glide, Noloco, ClickUp, and more, as well as offers a flexible API. The output is PDF and optionally a Google Doc. It also supports e-signature workflows.

## Authentication

DocsAutomator uses API keys for authentication. The API key is passed as a Bearer token in the Authorization header in the format `Authorization: Bearer YOUR_API_KEY`.

You can find your API key at Settings > Workspace > API in your DocsAutomator account.

The base URL for all API requests is `https://api.docsautomator.co`.

## Features

### Document Generation

Triggers document creation as a POST request. Multiple data source patterns are supported: passing data directly via the API, fetching from an Airtable record via record ID, fetching from a Google Sheets row via row number, fetching from a ClickUp task via task ID, or generating a one-off document by providing a Google Doc template URL and data directly without a saved automation.

- The `docId` (automation ID) identifies which automation/template to use.
- A `data` object contains key-value pairs mapping to template placeholders.
- For one-off documents, provide `docTemplateLink` instead of `docId`.
- Supports sync and async modes, webhook callbacks, and queue management.
- You can check job status and view queue stats.

### Automation Management

The API offers endpoints to perform all CRUD actions on automations (create, read, update, delete) as well as listing placeholders of documents, copying a Google Doc template with code, and more.

- List all automations associated with the account.
- Create, update, and delete automations.
- Duplicate automations.
- List placeholders in an automation, including all placeholders for the main document and line items.
- Duplicate Google Doc templates.

### E-Signatures

DocsAutomator supports collecting legally binding e-signatures on generated documents. Through the API, you can manage signing sessions, links, and audit trails.

- Supports unlimited signers using incrementing field tags.
- The signing portal is fully responsive with touch-based signature capture.
- Sessions remain pending/in progress until expiration.

### Output Options

Documents can be output as PDFs, saved to Google Drive, sent via email, merged with existing PDFs, and trigger webhooks — all automated.

- Generated documents return a download URL for the PDF.
- Optionally keep a Google Doc version for further editing.

## Events

DocsAutomator supports webhook notifications that can be configured per automation in the output settings.

### E-Signature Events

If your automation has a webhook URL configured, DocsAutomator will send webhook notifications for e-signature events.

- **Session Completed**: Fires once when all signers complete and the final signed PDF is generated. Includes the signed PDF URL, signer details with timestamps, field values entered during signing, and the original source data.
- **Session Declined**: Fires when a signer declines to sign. Includes details about who declined, an optional reason, and the original source data.
- Both event types include any custom `webhookParams` passed in the original API request. For Airtable and SmartSuite automations, the record ID is automatically included in the additional parameters.

### Document Generation Webhooks

The API supports webhook callbacks for document generation. A webhook URL can be configured in the automation's output settings to receive notifications when document generation completes.
