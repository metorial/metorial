Let me get more details on their webhooks and authentication documentation.# Slates Specification for PDF-API.io

## Overview

PDF-API.io is a PDF generation service that allows users to create PDF documents dynamically from pre-defined templates. Templates can be designed using a WYSIWYG drag-and-drop editor or an HTML/CSS editor, and then populated with dynamic data via a REST API.

## Authentication

PDF-API.io uses **Bearer Token** authentication.

1. Log in to your PDF-API.io account and navigate to the **API Tokens** page.
2. Click "Create a token", provide a name, and submit the form to generate a token.
3. Copy the token immediately — it cannot be viewed again after creation.
4. Include the token in every API request via the `Authorization` header:

```
Authorization: Bearer {token}
```

There are no OAuth flows, scopes, or additional credentials required. The single bearer token provides access to all API endpoints associated with your account.

## Features

### Template Management

Retrieve information about the PDF templates available in your account. You can list all templates or fetch a single template by its ID. Each template includes metadata such as its name, type (`editor` or `html`), creation date, and a list of defined variables with their expected data types. This is useful for discovering which dynamic placeholders a template expects before rendering.

### PDF Generation

Generate a PDF document by providing dynamic data that populates the placeholders defined in a template. The data is sent as key-value pairs matching the template's variables, supporting both simple string values and arrays of objects for dynamic tables with repeatable rows.

- **Output format**: The generated PDF can be returned as binary PDF data, a base64-encoded string (via JSON), or a temporary download URL (valid for 15 minutes).
- **Accept header**: Controls whether the response is binary PDF (`application/pdf`) or JSON with base64 content (`application/json`).
- Templates support text, images, tables, barcodes, QR codes, charts, and conditional rendering of elements.

### Template Merging

Combine multiple templates into a single PDF document. Each template in the merge request can receive its own set of dynamic data. This is useful for generating multi-section documents (e.g., an invoice combined with a shipping label) in one API call.

- Supports the same output options as single-template PDF generation (binary, base64, or URL).

## Events

PDF-API.io supports webhooks for real-time event notifications.

### PDF Created

Triggered when a new PDF is generated from a template. The webhook sends a POST request to your configured URL with a JSON payload containing the template ID and either the base64-encoded PDF content or a temporary download URL (valid for 15 minutes), depending on the output format used during generation.

- **Filtering**: Webhooks can optionally be scoped to a specific template so that only PDFs generated from that template trigger a notification.
- **Retry mechanism**: Failed deliveries are retried up to 3 times with exponential backoff.
- Webhooks are managed through the PDF-API.io web interface (not via API).
