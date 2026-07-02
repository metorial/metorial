# Slates Specification for Nanonets

## Overview

Nanonets is an AI-powered intelligent document processing (IDP) platform that extracts structured data from unstructured documents using OCR and deep learning models. It helps companies automate document-heavy business processes like accounts payable, order processing, and insurance underwriting. The API also supports image classification, object detection, and custom ML model training.

## Authentication

Every API request must include an API key, which serves as the primary method for client-side authentication. When you register for an account, you will automatically receive your first API key.

**Method:** HTTP Basic Authentication

The Basic HTTP Authentication Scheme is used for authorization through the Authorization header.

- The `username` is the API Key. The password is set to blank.
- The `Authorization` header value is `Basic <base64_encoded_string>`, where `<base64_encoded_string>` is the Base64 encoding of `<api_key>:` (API key followed by a colon, with no password).

**Example (curl):**

```
curl -u "YOUR_API_KEY:" https://app.nanonets.com/api/v2/OCR/Models/
```

**Obtaining an API key:**
Navigate to the left panel of the "Extract Data" screen and click on "Account Info". Under the "Account Info" section, click on "API Keys". On this page, click on the "Add a New Key" button.

**Base URL:** `https://app.nanonets.com/api/v2/` (legacy) or `https://app.nanonets.com/api/v4/` (current)

## Features

### Workflow Management

Create and manage document processing workflows (also called models). Nanonets provides an AI-driven Intelligent Document Processing API that transforms unstructured documents into structured data. Workflows can be configured as "instant learning" (zero-shot, no training needed) or custom-trained models. You define the fields and table headers you want extracted from documents.

- **Workflow types:** Instant learning (default) and custom-trained models.
- **Field configuration:** Define named fields (e.g., invoice_number, total_amount) and table headers (e.g., item_description, quantity) to extract.
- Pre-built models are available for common document types like invoices, receipts, purchase orders, bank statements, bills of lading, passports, and driver's licenses.

### Document Processing & Data Extraction

Upload documents (PDFs, images) to a workflow and receive extracted structured data including fields and tables with bounding box coordinates and confidence scores.

- Extract structured data from various document types (invoices, receipts, forms, etc.)
- Documents can be uploaded as files or via URLs.
- Processing can be synchronous (immediate results) or asynchronous (processed within 5 minutes), which is ideal for handling large files.
- Documents can be processed at the page level (each page treated as a separate document) or at the document level (all pages processed as a single document).
- Selective page processing is supported (e.g., process only specific pages of a PDF).

### Image Classification

Create models that classify images into predefined categories. The models that can be built are Image Classification, Multi-label Classification, Object Detection, and OCR.

- Define categories, upload labeled training images (minimum 25 per category), and train a model.
- Run predictions on images via file upload or URL to get category labels with probability scores.

### Object Detection

Create models that detect and locate objects within images, returning bounding box coordinates for each detected object.

- Upload images with bounding box annotations for training.
- Run predictions to get object locations and classifications within images.

### Model Training & Management

Train custom AI models with your own labeled data and manage their lifecycle.

- Upload training data (images with annotations) via files or URLs.
- Initiate model training and monitor training status.
- Retrieve model information and details across all models in an account.
- Retrain models with additional data to improve accuracy.

### File Review & Approval

Manage a human-in-the-loop review process for extracted data.

- Approve, reject, or moderate extracted predictions.
- Add comments to files during review.
- Identify duplicate files.
- Configure multi-stage approval workflows with user groups and delegation.

### Data Actions & Post-Processing

Apply transformations and validations to extracted data within workflows.

- Formatting operations: date formatting, currency detection, find & replace, regex matching, case changes, number formatting, etc.
- Lookup enrichment from external sources (Xero, NetSuite, Google Sheets, or Nanonets AI).
- Conditional logic blocks for routing data.
- Custom Python post-processing scripts.

### Document Import & Export

Import documents from various sources and export processed data to external platforms.

- Nanonets supports multiple import options. You can set up an import block to automatically upload files based on specific triggers. Sources include email, Dropbox, Google Drive, OneDrive, SharePoint, and Zapier.
- Export blocks send final results to various platforms, such as Google Sheets, QuickBooks, Google Docs, and databases like PostgreSQL, MySQL, and MSSQL. Additional export destinations include Xero, Zoho Books, Sage, Salesforce, Smartsheet, Microsoft Excel, OneDrive, SharePoint, FTP servers, and webhooks.

## Events

Nanonets supports webhook-based event notifications for document processing workflows.

### Document Processing Events

By setting up a Webhook, you can configure Nanonets to send notifications directly to a URL of your choice. This feature ensures that you receive real-time updates whenever a file is processed or approved.

Supported webhook triggers:

- **On Inference:** Fires automatically as soon as a file is processed and extraction is complete.
- **On All Validations Passing:** Fires only after all configured approval/validation stages have been passed.
- **On Approval:** Fires when a file has been manually approved.
- **On Assignment:** Fires when a file is assigned or un-assigned to a reviewer.
- **On Rejection:** Fires when a file is manually rejected.

**Configuration options:**

- Export granularity can be set to document level or page level.
- Conditional exports can be configured based on extracted data fields, combining conditions using 'AND' and 'OR' operators.
- The webhook payload includes extracted fields, predicted bounding boxes, moderated boxes, raw OCR data, approval status, and file metadata.
