# Slates Specification for PDF.co

## Overview

PDF.co is a cloud-based REST API service for PDF and document processing. It provides capabilities for converting, extracting data from, editing, and generating PDF documents, as well as barcode operations and document classification. The API also supports processing of Excel files and email messages.

## Authentication

All requests use the base URL `https://api.pdf.co/v1`. PDF.co requires an API Key for authentication of its requests.

To authenticate, add a header named `x-api-key` using your API Key as the value.

Example header:

```
x-api-key: your_api_key_here
```

The API key can be obtained by signing up with PDF.co. After logging in to your account at https://app.pdf.co, the API Key can be found in the "View Your API Key" section.

No OAuth or other authentication methods are supported. All requests must be sent over HTTPS.

## Features

### PDF Conversion (From PDF)

Convert PDF documents to other formats including CSV, JSON, text, Excel (XLS/XLSX), XML, HTML, and images (JPG, PNG, WebP, TIFF). You can extract structured data from tables or form fields, with automatic table structure detection. Supports page selection, OCR language settings, and password-protected PDFs.

### PDF Generation (To PDF)

Convert various formats to PDF, including CSV, XLS, XLSX, DOC, DOCX, RTF, TXT, XPS, JPG, PNG, TIFF, URL, and EMAIL. HTML to PDF conversion supports configurable output paper size, page orientation, margins, and custom headers and footers.

### PDF Editing

Add text, images, and signatures to existing PDFs. Fill PDF form fields and create new PDFs from templates. Search and replace or delete text within PDFs. Replace text with images. Delete specific pages or rotate pages.

### PDF Merging & Splitting

Merge documents into a single PDF file, where source documents can be of different formats such as PDF, DOC, text, Excel, or ZIP. Split PDFs by page ranges or by text search/barcode content.

### Data Extraction

- **AI Invoice Parser**: Automatically extract structured data from invoices using AI.
- **Document Parser**: Automatically parse PDF, JPG, and PNG documents to extract fields, tables, values, and barcodes from invoices, statements, orders, and other documents. Supports custom templates for accurate, repeatable extraction.
- **Document Classifier**: Auto-classify incoming documents based on keyword rules, e.g., identifying which vendor provided a document to determine which extraction template to apply.

### PDF Security

Add or remove passwords from PDF documents. Configure encryption algorithms and set granular permissions (printing, copying, form filling, modification, content extraction, annotation modification).

### PDF Search & OCR

Search for text within PDFs. Turn PDF and scanned images into text-searchable PDFs, or make PDFs non-searchable.

### Barcode Operations

Generate barcode images supporting QR Code, DataMatrix, Code 39, Code 128, PDF417, and many other barcode types. Read barcodes from images and PDFs, supporting all popular barcode types.

### Excel Conversion

Convert Excel files (XLS/XLSX) to CSV, HTML, JSON, text, XML, or PDF.

### Email Processing

Extract email attachments with basic email information. Decode email files and send emails.

### File Management

Upload files to PDF.co's temporary storage (via direct upload or presigned URLs) for use with other API operations. Download processed result files. Supports asynchronous processing mode for large files with background job status checking.

### PDF Info

Read PDF metadata and document information, including form field details.

## Events

PDF.co does not support traditional event subscriptions or webhooks for monitoring external changes. However, it does support **callbacks** — when using the asynchronous processing mode, you can provide a `callback` URL in your API request, and PDF.co will send an HTTP POST request to that URL upon job completion.

- The `callback` parameter accepts a URL that will receive a POST request when the async job finishes.
- Callback URLs support Basic Authentication credentials embedded in the URL.
- The callback endpoint must respond within 20–30 seconds; otherwise PDF.co retries up to 3 times.
- Callbacks are available on virtually all API operations (conversions, extraction, editing, merging, splitting, barcode operations, etc.).

This is a job-completion notification mechanism, not an event subscription system for ongoing resource changes.
