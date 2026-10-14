# Carbone Integration Specification

## Overview

Carbone is a document generation engine that merges JSON data into templates (DOCX, XLSX, PPTX, ODT, ODS, HTML, etc.) to produce documents in various output formats including PDF, DOCX, XLSX, CSV, XML, and more. It accepts XML-based templates: DOCX, XLSX, PPTX, ODT, ODS, ODG, ODP, XHTML, IDML, HTML or XML files. It is available as a Cloud API or as an on-premise deployment.

## Authentication

Carbone authenticates API requests using your account's API keys by joining the header `Authorization` with the API key as value.

The authentication method is **Bearer Token (API Key)**:

- **Header**: `Authorization: Bearer <API_KEY>`
- **Base URL**: `https://api.carbone.io`
- There are two types of API keys: a **Production API key** (can be used to generate production documents, requires a payment method) and a **Test API key** (can be used to generate test PDFs with a watermark).
- You can get your API key from your Carbone account at https://account.carbone.io/.
- It is recommended to specify an API version by using the `carbone-version` HTTP header, for example: `{ "carbone-version": 5 }`.

Example request header:

```
Authorization: Bearer test_eyJhbG....o3wfR
Content-Type: application/json
carbone-version: 5
```

All API endpoints are protected by authentication except `GET /render/:renderId` and `GET /status`.

## Features

### Template Management

Upload, download, list, update, and delete document templates. A template is a reusable file with Carbone tags (placeholders), used to inject data and generate documents. Templates are your documents' base design and include static and dynamic content thanks to Carbone tags like `{d.value}`.

- Templates can be uploaded as multipart form data or as base64-encoded strings.
- V5 added endpoints to update template metadata without re-uploading, retrieve a list of templates with filtering, and get lists of categories and tags used by templates.
- When versioning is enabled, a unique template ID is created along with a version ID. Both IDs can be used to generate documents, and multiple versions can be managed under the same Template ID.
- Providing a template ID during upload adds a version to that template, even when the versioning flag is omitted. Unversioned uploads can return the legacy SHA-256 template ID and file extension; the integration retrieves the missing metadata through the template list endpoint.
- Template metadata (name, comment, tags) can be updated, deployed versions can be controlled via the `deployedAt` field, and template lifecycle can be managed through expiration timestamps.
- Templates uploaded with a production token are stored for unlimited time; templates uploaded with a test token are deleted within 30 days.

### Document Generation (Rendering)

Generate documents by combining a template with a JSON data payload. Generate a report from the template ID and a JSON dataset, then the request returns a unique render ID.

- **Output format conversion**: By default, if `convertTo` is undefined, the output file type is the same as the input template file type. You can convert to PDF, DOCX, XLSX, and many other formats.
- **Converter engine selection**: When converting to PDF, you can choose LibreOffice (default), OnlyOffice (ideal for DOCX/XLSX/PPTX), or Chromium (for HTML-to-PDF).
- **Localization**: You can set timezone and locale for the generated document, and provide a complement data object, enumerations, and a translations dictionary.
- **Dynamic filenames**: The generated report filename is itself a template, allowing data-driven file naming via the `reportName` option. Omit the extension; Carbone adds it automatically.
- **Direct download**: If the query parameter `download=true` is used, the response body will be the file itself.
- You can also provide a template inline as a base64-encoded string instead of referencing a stored template ID.

### Document Download

Synchronous `render_document` calls include a downloadable file and preserve the render ID. `download_document` prepares a download using an existing render ID, including reports completed asynchronously. Generated documents expire one hour after generation and can be downloaded once. Downloading deletes the provider's copy; expired or consumed reports cannot be renewed. Asynchronous downloads must wait for the completion webhook. Preparing a download does not consume the report or confirm its availability.

`download_template` prepares an authenticated download of the stored template or a specific version. Use `list_templates` to discover IDs. Template download URLs use the API credentials and do not contain an expiring download signature. Legacy unversioned upload metadata recovery requires the V5 template-list endpoint and stateful storage; older or stateless servers may upload successfully but fail to provide the metadata needed by the existing output contract.

### Batch Document Generation

Carbone can generate multiple reports in one request using a single template. This returns a compressed ZIP (or PDF) file containing all generated reports, useful for bulk personalized documents like letters or invoices.

- Requires the `batchSplitBy` attribute in the render request body.
- Requires asynchronous job processing via the webhook header.
- On Cloud, data payload is limited to 100 objects per batch.

### Asynchronous Rendering

Carbone offers asynchronous rendering, notifying your application at a custom URL once the document is generated. The default rendering timeout for webhooks is set to 5 minutes.

- Enabled by sending a render request with the HTTP header `carbone-webhook-url` set to your webhook URL. The immediate response has an empty render ID; use the ID from the completion callback for the report download.
- Custom webhook headers (e.g., for authentication) can be added via `carbone-webhook-header-X` headers.

### API Status

A public status endpoint is available to check whether the Carbone service is running, accessible without authentication.

## Events

Carbone supports webhooks for asynchronous document rendering notifications.

### Render Completion

When a document generation is completed asynchronously, the webhook URL will be called with an HTTP body containing the `renderId`, which can then be used to download the generated document.

- The webhook URL is set per-request via the `carbone-webhook-url` header on the render call.
- Custom headers can be added to the webhook callback by setting `carbone-webhook-header-X` headers (e.g., `carbone-webhook-header-authorization: my-secret`).
- This is the only event type supported. There are no subscription-based or persistent webhook registrations; webhooks are configured on each individual render request.
