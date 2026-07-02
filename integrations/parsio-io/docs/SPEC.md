Now let me get more details on the webhook events and full API:# Slates Specification for Parsio.io

## Overview

Parsio.io is a no-code document parsing and data extraction platform. It extracts structured data from emails, PDFs, images, and other document formats (HTML, CSV, DOCX, XLSX, XML, TXT, RTF) using template-based, OCR, and GPT-powered parsing engines. Extracted data can be exported as JSON, CSV, or Excel, or sent to external applications via webhooks and integrations.

## Authentication

Parsio.io uses **API key** authentication.

- The API key can be found in the user's account settings at `https://app.parsio.io/account`.
- The API key must be included in the `X-API-Key` HTTP header with each request.
- Unauthenticated responses return an HTTP 401 Unauthorized code.
- Base URL: `https://api.parsio.io`

Example:

```
curl -X GET https://api.parsio.io/mailboxes/ -H "X-API-Key: <YOUR_API_KEY>"
```

## Features

### Mailbox Management

Mailboxes are the core organizational unit in Parsio. Each mailbox has a unique email address where documents can be forwarded for parsing. You can create, update, list, and delete mailboxes. Mailbox settings include configuring the email prefix, whether to process attachments, whether to automatically collect email addresses, and alert frequency.

### Document Submission and Parsing

Submit documents for parsing in two ways:

- **File upload**: Upload files (PDF, HTML, CSV, TXT, DOCX, RTF, XML) to a mailbox for parsing. Supported formats include PDF, HTML, CSV, TXT, DOCX, RTF, or XML, with a max file size of 20MB.
- **HTML/Text submission**: Send HTML or text content directly via API, optionally including email metadata (from, to, subject). If both HTML and text are provided, HTML takes priority.

You can also attach custom metadata to documents for linking with external systems. Documents can be re-parsed or skipped in bulk.

### Document Retrieval

List and search documents within a mailbox with filters for date range, search query, and document status (parsed, fail, skipped, new, quota, parsing, exception). Retrieve individual documents with their parsed data as JSON.

### Parsed Data Retrieval

Retrieve structured parsed data from a mailbox, filterable by date range. Also supports listing automatically collected email addresses from a mailbox.

### Template Management

Templates define the extraction rules for documents. You can list, view, enable, disable, and delete parsing templates for a mailbox. Templates can be managed in bulk (enable/disable/delete multiple at once).

### Webhook Management

Create and manage webhooks to receive real-time notifications when documents are processed. Webhooks can be created, updated, listed, and deleted. Each webhook is scoped to a mailbox and a specific trigger event.

## Events

Parsio supports **webhooks** for real-time event notifications. Webhooks are configured with a trigger event per mailbox. The following event types are available:

### Document Parsed (`doc.parsed`)

Fires when a document has been successfully parsed. The webhook payload contains the extracted structured data in a nested format.

### Document Parsed Flat (`doc.parsed.flat`)

Fires when a document has been successfully parsed. The payload contains the extracted data in a flattened (non-nested) format, which can be easier to consume for simple integrations.

### Document Failed (`doc.fail`)

Fires when a document fails to parse, allowing you to handle errors or trigger fallback workflows.

### Document Received (`doc.received`)

Fires when a new document is received in the mailbox, before any parsing occurs.

### Table Parsed (`table.parsed`)

Fires when tabular data within a document has been parsed. Requires specifying a `table_id` parameter to indicate which table field to listen to.
