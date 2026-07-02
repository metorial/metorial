Now let me check the V2 swagger docs to understand the full API feature set:# Slates Specification for Docupilot

## Overview

Docupilot is a document automation/generation software that allows you to create efficient document workflows for your business. It replaces manual filling in of repetitive documents with a template-based system which reduces the amount of time spent on generating content manually and also human errors. It generates PDFs, DOCX files, contracts, invoices and more with data from online services.

## Authentication

Docupilot supports API Key + Secret authentication for its V2 API.

**V2 API Authentication (Current):**

1. APIs can be accessed using a combination of API Key and Secret created from the **API Settings** section. Go to **Settings > API Settings** to create a new API key. Copy the Key & Secret - download the copy if needed. The secret cannot be retrieved again.

2. The base64 encoded value of `key:secret` will be your API credential. Encode it as follows:

   ```
   echo -n YOUR_API_KEY:YOUR_API_SECRET | base64
   ```

3. Use the resulting base64 string as a Bearer token in the `Authorization` header:

   ```
   Authorization: Bearer <Base64 encoded key:secret>
   ```

4. The `X-Workspace` header is required to be sent for all APIs that interact with your Workspace (e.g., Templates, etc.). This header holds the ID of your workspace for which the request is being made. You can locate your Workspace ID on the Workspace details page.

**Required credentials:**

- **API Key**: Generated from Settings > API Settings
- **API Secret**: Provided once at key creation time
- **Workspace ID**: Found on the Workspace details page in dashboard Settings

**Base URL:** `https://api.docupilot.app`

## Features

### Template Management

Allows listing, retrieving, creating, updating, and deleting document templates. Templates can be filtered and organized by folder. Templates support multiple document types, and Docupilot offers an online builder tool for creating custom templates from scratch. Supported template formats include DOCX, PPTX, XLSX, Fillable PDF, and an online HTML document builder. Output types include PDF, HTML, PNG (for builder templates), DOCX, and PDF (for DOCX templates).

- Templates use merge fields (tokens) in `{{field_name}}` syntax for dynamic content.
- Templates can be set to Publish or Draft status.
- Auto-numbering can be enabled to display a unique number across each generated document.
- For PDF output, password protection can be configured, including dynamic passwords using tokens.

### Document Generation (Merge)

Allows creating a new document from a template by merging data into it. The body parameters depend on the tokens configured in the document template. When data is sent to the API endpoint, it generates a document and sends it to configured delivery locations. If no deliveries are configured, it returns a secure file URL to download the generated document.

- Data is submitted as JSON, with keys matching the template's merge field tokens.
- Supports nested data structures and arrays (e.g., line items in invoices).
- The secure download URL is valid for 24 hours by default, customizable under Data Retention Preferences.
- Options to receive the generated document as a file in the response or as a URL.

### Folder Management

Docupilot lets you organize all your templates by categorizing them into customized folders. The API allows creating, listing, updating, and deleting folders.

- If you delete a folder, templates inside that folder will be moved automatically to the Home folder.

### Document Deliveries

Generated documents can be automatically delivered to various destinations. Supported delivery types include: Email, Webhook, eSignature, SFTP, Dropbox, Google Drive, OneDrive, DropboxSign (formerly HelloSign), DocuSign, SignNow, Xodo Sign (formerly Eversign), Signable, Yousign, Amazon S3, Azure Blob, and Box Drive.

- Multiple deliveries can be configured per template.
- Deliveries are triggered automatically upon document generation.

### eSignatures

Docupilot has a built-in eSignature feature that allows seamless delivery of documents for signing right after generation. Docupilot supports Advanced Electronic Signatures (AES), which comply with legal standards and include added verification, audit trails, and signer authentication.

- Customizable eSignature fields can be placed directly into templates using special placeholder tokens that define where and how each signer interacts with the document.
- Reminder settings allow automated follow-ups with recipients, including configurable expiry, first reminder timing, and reminder frequency.
- Documents are organized as "envelopes" that include the document(s) sent for signing, each with a unique identifier for tracking.
- An audit trail document records the activity log of all actions on an envelope (sent, viewed, signed, completed/declined, etc.).

### Bulk Document Creation

Documents can be generated in bulk from templates, useful for mass document creation scenarios.

### Content Library

Docupilot provides a content library for reusable content snippets that can be referenced across templates.

## Events

Docupilot supports outbound webhooks — it triggers a webhook every time a new document is created. You can send data and the generated document to CRM systems (Salesforce, Zoho CRM), Zapier, or your own API.

### Document Generation Webhook (Outbound Delivery Webhook)

A webhook delivery is configured per template from the Deliveries tab. Configurable options include the delivery name and the POST URL to be called once a document merge occurs.

- The webhook is sent as an HTTP POST with `multipart/form-data` containing the file and file name.
- This is an outbound delivery mechanism (Docupilot pushes the generated document to your URL), not a subscription-based event system.
- There is no general-purpose webhook subscription API for listening to arbitrary events (e.g., template changes, envelope status updates). Webhooks are specifically tied to document generation deliveries.
