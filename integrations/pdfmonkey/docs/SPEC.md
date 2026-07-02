Let me get more details on the specific features like synchronous generation, share links, PDF forms, and image generation.# Slates Specification for PDFMonkey

## Overview

PDFMonkey is a PDF generation API that creates PDF documents from HTML/CSS templates populated with dynamic JSON data. It provides a dashboard for managing templates and a REST API for programmatic document generation. It can also generate images from templates.

## Authentication

PDFMonkey uses **API Key** (Bearer Token) authentication.

The first step is to get your API Secret Key, available on the My Account page in the PDFMonkey dashboard.

Your API Secret Key should be passed as an HTTP header named `Authorization` and be prefixed with `Bearer`.

Example:

```
Authorization: Bearer YOUR_API_SECRET_KEY
```

The API base URL is `https://api.pdfmonkey.io/api/v1/`.

If you have multiple PDFMonkey workspaces, make sure you're using the API key from the correct workspace.

No OAuth or additional scopes are required. A single API key per workspace provides full access to all API operations.

## Features

### Document Generation

Create PDF documents by specifying a template ID, a JSON payload of dynamic data, and optional metadata. A synchronous generation mode is available via a dedicated endpoint that waits for the generation to either succeed or fail before responding, as an alternative to the default asynchronous mode. Documents can be created in draft status for preview, or set to pending to immediately queue generation. Custom filenames can be set via the `_filename` key in the metadata object.

### Template Management

Create, update, and publish templates using the API. Templates consist of an HTML body, SCSS styles, sample data, and settings for page layout (paper format, orientation, margins, headers/footers). Templates have separate published and draft versions, allowing changes to be previewed before publishing. Templates can be organized into folders and configured with different PDF engines.

### Document Retrieval and Management

Fetch document details including status, download URL, and preview URL. Download URLs are valid for 1 hour; after that, you need to fetch the document's details again to get a fresh URL. Documents can also be deleted via the API.

### Automatic Deletion (TTL)

Templates can be configured with a time-to-live (TTL) to automatically delete documents after a certain amount of time. Available TTL options include 5 minutes, 20 minutes, 1 hour, 1 day, 1 week, 1 month, 1 year, or no expiration, depending on the plan.

### Image Generation

In addition to PDFs, PDFMonkey can generate images from templates.

### Share Links

When a Document is successfully generated, it will expose a `public_share_link` property that will contain a URL pointing to the PDF file. The share links feature is only available for Premium plans.

### PDF Password Protection

Templates can be configured to generate password-protected PDF documents.

### Snippets

If you need to share code between Templates, you can define snippets. The name you give a Snippet is how you will refer to it later on in your Templates.

### Current User

Retrieve information about the authenticated user/account, including available document quota and current plan details.

## Events

PDFMonkey supports webhooks for reacting to document generation events.

### Document Generation Success

You can set a URL and select the `documents.generation.success` event type. Your endpoint will be called anytime a Document is generated. You can define a webhook endpoint that will be called for any document (workspace-wide), or scope it to a specific template by adding a channel in the format `template-YOUR_TEMPLATE_ID`. You can also scope webhooks to a folder using the format `folder-YOUR_FOLDER_ID`.

- Webhooks can be scoped to: all documents (workspace-wide), a specific template (up to 3 channels per endpoint), or a folder.
- Webhook payloads are signed using Svix, allowing verification that the webhook is authentic.
- PDFMonkey webhooks use at-least-once delivery, meaning you might receive the same event multiple times.
