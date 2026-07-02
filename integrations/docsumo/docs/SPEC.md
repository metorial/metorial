Now let me get more details on the specific webhook events and the features of Docsumo's API.Now let me check the actual webhook settings page for more details on specific events:Now I have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Docsumo

## Overview

Docsumo is an AI-powered intelligent document processing (IDP) platform that enables automated data extraction from various document types such as invoices, bank statements, tax forms, insurance documents, and more. It provides pre-trained AI models for structured data capture, document review and validation tools, and analytics capabilities.

## Authentication

Docsumo uses API Key authentication. The API key is passed in the HTTP request header using the `X-API-KEY` header.

Alternatively, the key can be included as an `apikey` header in requests.

**Obtaining an API Key:**

Navigate to "Settings" in your Docsumo account, then select "Integrations." In the Integrations section, you'll find your API key — simply copy it.

The API key is different for test and production mode.

**Base URL:** `https://app.docsumo.com`

**Example header:**

```
X-API-KEY: <your_api_key>
```

The API key can also be retrieved from `https://app.docsumo.com/settings/webhook-api/`.

## Features

### Document Upload & Processing

Upload documents for AI-powered data extraction. Files need to have a document type assigned. Pre-trained models (if available) for that document type are used to capture key-value pairs and tabular data. Supports file uploads from local storage, URLs, and base64-encoded content. Supported file types include JPG, JPEG, PNG, TIFF, and PDF. Custom metadata and user-defined document IDs can be attached during upload.

### Data Extraction

Retrieve structured extracted data from processed documents, including key-value fields and table/line-item data. Specialized analytics are available for certain document types, including bank statement analytics and MCA (Merchant Cash Advance) analysis.

### Document Management

List, view details, delete, and manage documents. Documents can be organized into folders, moved between folders, and split. A review URL can be generated for each document to allow human review and validation in the Docsumo web interface. Document processing requests cannot be canceled once submitted.

### Document Types & AI Models

Access pre-trained AI models from Docsumo's AI Model Hub covering various document categories: bank statements, invoices, bills of lading, utility bills, passports, driving licenses, ACORD insurance forms, tax forms (W2, W9, 1040), cheques, payslips, brokerage statements, and more. You can also train custom models or fine-tune existing ones on your own data.

### Document Review & Validation

Update extracted field values, change document review status (e.g., approve or reject), and generate shareable review URLs. The platform supports field-level validation, confidence scores, and AI extraction reasoning.

### Case Management

Manage cases that group related documents. List agents, view case types and details, upload and update cases, run case workflows, and delete cases in bulk.

### Database Tables

Create and manage lookup/reference tables used in document processing. Add tables, insert rows, retrieve table data, update cells, and delete tables.

### AI Auto-Classification

Automatically classify uploaded documents into the appropriate document type using general or custom auto-classifiers.

### Document Splitting

Automatically or manually split multi-document files into individual documents with AI-powered split detection.

## Events

Docsumo supports webhooks for real-time event notifications. Webhooks are set up by configuring the endpoint URL and event triggers in the Docsumo account settings.

### Document Status Change

Receive notifications when a document's processing status changes, such as when processing completes, a document is approved, or its review status is updated.

### User Status Change

Receive notifications when a user account status changes, such as account activation or deactivation.

**Configuration notes:**

- Webhook URL is configured under Settings > Integrations in the Docsumo dashboard.
- Webhooks can be triggered by events such as document uploads, status changes, and data processing updates. Choose the events relevant to your integration needs.
- The webhook URL is different for test and production mode.
- Payloads are delivered in JSON format via HTTP POST.
- Webhooks can be configured to send notifications to multiple endpoints.
- Failed deliveries are retried up to 3 times, spaced 1–3 seconds apart. Failures after all retries are logged in the activity logs.
- A static IP for webhook delivery can be enabled by contacting Docsumo support.
