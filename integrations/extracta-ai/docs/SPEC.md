Now let me get more details on authentication and the options/fields configuration:Now let me get details on the document classification API and options:Now I have enough information to write the specification.

# Slates Specification for Extracta.ai

## Overview

Extracta.ai (Extracta LABS) is an AI-powered document data extraction and classification service. It specializes in turning unstructured documents into structured, actionable data, processing a wide range of documents both structured and unstructured, including PDFs, Word documents, text files, and scanned images (PNG, JPG) using OCR technology where necessary. The technology supports up to 27 languages.

## Authentication

Extracta.ai uses **API key-based authentication** via Bearer tokens.

To begin using the Extracta LABS API, you'll need to obtain an API key. This key is unique to your account and serves as the credential for accessing the API.

**How to obtain an API key:**

1. Visit https://app.extracta.ai to sign up for an Extracta account.
2. Once your account is set up, log in and navigate to the /api page on the dashboard. Here, you'll find the option to generate a new API key.
3. Your new API key will be displayed once generated. Make sure to copy and store it in a secure location.

**Usage:** Include your API key in the header of each request as a Bearer token:

```
Authorization: Bearer <Your_API_Key_Here>
Content-Type: application/json
```

The base URL for all API requests is `https://api.extracta.ai/api/v1`.

Regenerate your API key if you suspect it has been compromised. You can do this from the same /api page where you generated it initially.

## Features

### Data Extraction

Create and manage extraction templates that define which fields to extract from documents. Initiates a new document extraction process. This endpoint allows you to define an extraction with specific fields, options, and configurations. Once created, you can use the returned extractionId to upload files for processing.

- **Custom fields:** Define fields to extract using `string`, `object`, and `array` types. Each field has a key, description, and optional example value. Fields support nested objects and arrays for complex document structures (e.g., line items on an invoice, parties in a contract).
- **Language:** Specify the document language for accurate extraction. Supports up to 27 languages.
- **Processing options:**
  - `hasTable` — enables table analysis and extraction.
  - `hasVisuals` — enables detection and extraction from charts, graphs, and diagrams.
  - `handwrittenTextRecognition` — enables OCR for handwritten text.
  - `checkboxRecognition` — detects checkbox states (checked/unchecked).
  - `longDocument` — optimized processing for very large or complex documents.
  - `splitPdfPages` — treats each PDF page as a separate extraction unit (useful for multi-page documents where each page is a separate record).
  - `specificPageProcessing` — processes only a specified range of pages from a PDF, with configurable `from` and `to` page parameters.
- Extractions can be viewed, updated, and deleted after creation.

### File Upload and Processing

Upload files to an existing extraction for processing. Files are processed in batches. Supported formats include PDFs, Word documents, text files, and scanned images (PNG, JPG).

- Files are associated with an extraction via its `extractionId`.
- Results can be retrieved per batch after processing completes.

### Document Classification

Extracta LABS specializes in extracting structured data from any type of document. The Document Classification API automatically assigns documents to predefined categories based on their content.

- Users define **document types** with a name, description, and a list of unique/keywords to guide classification.
- Each document type can optionally be linked to an existing extraction template (`extractionId`) to automatically extract structured data upon classification.
- Supports creating, viewing, updating, and deleting classifications.
- Files can be uploaded and results retrieved similarly to the data extraction workflow.

### Pre-built Document Templates

Extracta.ai provides ready-to-use extraction templates for common document types:

- Resumes / CVs
- Contracts
- Business Cards
- Emails
- Invoices
- Receipts
- Bank Statements

These serve as starting points and can be customized.

### Credit Management

The API provides an endpoint to check remaining account credits, enabling usage monitoring.

## Events

Extracta.ai supports **webhooks** for receiving real-time notifications about extraction events.

Extracta LABS webhooks send an event field in the payload to indicate what type of action occurred in the system. The event name is a namespaced string. All current webhook events are prefixed with `extraction.` because they relate to data extraction.

Webhook payloads are signed using HMAC-SHA256 with a secret key available from the dashboard, sent via the `x-webhook-signature` header.

### Extraction Processed (`extraction.processed`)

Triggered when one or more files are successfully processed and data has been extracted. If you process multiple files in a single upload, this webhook will be triggered when all the files are processed.

- The payload includes the extraction ID, batch ID, file ID, file name, status, extracted results, and file URL for each processed file.

### Extraction Edited (`extraction.edited`)

Fired when a user manually edits the extracted data in the Extracta LABS interface.

- Useful for syncing corrections or manual adjustments made via the web platform back into your system.
