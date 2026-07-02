# Slates Specification for Parseur

## Overview

Parseur is an AI-powered document parsing platform that extracts structured data from emails, PDFs, and other documents. It uses templates and AI engines to identify and extract specific fields, then exports the parsed data via webhooks, API, or integrations with automation platforms. It supports ready-made templates for common document types like invoices, resumes, leads, and travel bookings.

## Authentication

Parseur uses **token-based authentication** via API keys.

1. Create a new API key in **Account → API keys** in the Parseur app at `https://app.parseur.com/account/api-keys`.
2. Include the key in the `Authorization` HTTP header with every request to `https://api.parseur.com`:
   ```
   Authorization: <YOUR_API_KEY>
   ```
   The token key should be included in the Authorization HTTP header. Previously the key was prefixed by the string literal "Token", but the prefix is no longer required.
3. You can create restricted API keys with access limited to specific mailboxes. This feature is available on Pro plans and higher only.
4. Keys can optionally have an expiration set in months, which cannot be changed later.
5. The secret key is only shown once at creation time. Copy and store it securely; if lost, create a new key.

If authentication fails, the API responds with HTTP 403.

## Features

### Mailbox (Parser) Management

Mailboxes are the core organizational unit in Parseur. Each mailbox is configured to process a specific type of document. You can create, update, copy, list, and delete mailboxes via the API. When creating a mailbox, you can specify an AI engine, a ready-made template slug (e.g., invoices, leads, travel, resume-cv, food-delivery, real-estate, etc.), and optionally define custom fields.

### Document Upload and Processing

Processing is asynchronous — a successful upload confirms receipt, not that parsing is finished. You can upload binary documents (PDFs, images, etc.) or email/text content. Documents can also be sent by forwarding emails to a mailbox's dedicated email address. After upload, you can list, retrieve, reprocess, skip, copy, or delete documents. Documents go through various statuses: INCOMING (received), ANALYZING (being analyzed), PROGRESS (being processed by AI), PARSEDOK (processed and data available), and others like QUOTAEXC (insufficient credits) or SKIPPED.

### Data Retrieval

Parsed data can be retrieved via the API in JSON, CSV, or XLS formats. You can list and search documents within a mailbox with sorting and date filtering options (with optional timezone specification). The API also supports custom downloads that can be created, updated, and deleted per mailbox.

### Template Management

Templates define how Parseur extracts data from documents. You can list templates within a mailbox, get template details, copy templates between mailboxes, and delete templates. Templates work in combination with AI engines to match incoming documents and extract the configured fields.

### Mailbox Schema

You can retrieve the schema of a mailbox, which describes the fields and structure of the extracted data. This is useful for dynamically building integrations that adapt to the mailbox's configuration.

### Webhook Management

Webhooks can be created, enabled, disabled, and deleted via the API. Each webhook is associated with a mailbox and a specific trigger event. You can configure the target URL and custom HTTP headers for authentication.

## Events

Parseur supports outbound webhooks that push data to your endpoint when specific events occur in a mailbox. A webhook is a URL you register on a mailbox. When a chosen event occurs, Parseur makes a POST call to that URL with the extracted data in the request body.

### Document Processed

Fires when a document is processed. Payload matches the JSON output for that document. This is the default trigger event.

### Document Processed (Flattened)

If your mailbox has table fields, this flattens table data for systems that don't support nested JSON.

### Table Item Processed

Sends the table rows as a JSON array, one item per row. Requires selecting which table field to use as the trigger source.

### Process Failed

Fires when a document can't be parsed. Useful for alerting teams about documents that need new templates or manual review.

### Export Failed

Fires when another export (webhook or automation) fails; includes error details so you can alert teams or tools.

**Configuration options for all webhook events:**

- Target URL (HTTPS recommended)
- Custom HTTP headers (e.g., for authorization tokens)
- Multiple webhooks can be configured per mailbox with different triggers
- Webhooks can be enabled or disabled independently
