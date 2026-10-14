# Encodian Integration Specification

## Overview

Encodian is a document automation platform providing over 200 actions for document generation, manipulation, conversion, OCR, data extraction, and AI processing. It offers a REST-based API (Encodian Flowr) with over 200 actions across 9 specialist connectors, designed specifically for the Microsoft ecosystem including Power Automate, Azure Logic Apps, and SharePoint.

## Authentication

Encodian uses **API Key** authentication.

- Encodian uses API keys for authentication.
- The API key is passed as a custom HTTP header: `X-ApiKey` on every request to the API at `https://api.apps-encodian.com`.
- To sign up, complete the sign-up form on the Encodian website at https://www.encodian.com/apikey. Once you have completed the form, you'll be instantly allocated an API key.
- You can generate additional API keys from the Encodian account portal at https://account.encodian.com/powerautomate/apikey.
- An Encodian subscription is required to use the connectors. Once your 30-day trial expires, your subscription is automatically transitioned to Encodian's 'Free' tier unless a paid plan has been purchased.

**Example request header:**

```
X-ApiKey: your-api-key-here
```

## Features

### Document Generation

Populate templates in Word, PowerPoint, and Excel with dynamic data, and convert HTML to PDF. Supports populating Word, PowerPoint, Excel templates, and converting HTML to PDF. Inserts data from JSON into placeholders or tagged fields within a Word template. Templates use a dedicated syntax supporting conditional expressions, repeating content, numbered lists, and formatting.

### File Format Conversion

Convert between PDF, Word, Excel, PowerPoint, TIFF, and other formats. Also supports HTML/URL to PDF, HTML to DOCX, JSON to Excel, PDF to Excel, HEIC/HEIF image files to PDF, and HTML or URLs into image files (JPG, PNG).

### PDF Manipulation

Merge, split, redact, compress, watermark, and automate PDF processes. Additional capabilities include: filling PDF forms with JSON data, flattening form fields, inserting HTML into PDFs, adding tables of contents, inserting page numbers, adding headers/footers, embedding file attachments, deleting specific or blank pages, extracting text layers, and checking/setting password protection. Supports PDF/A compliance conversion.

### OCR (Optical Character Recognition)

Extract text from scanned documents and images. Available in both standard and AI-enhanced modes. Configurable options include language selection, OCR quality (quality vs. fast), PDF/A compliance, and clean-up operations such as auto-rotate, deskew, despeckle, brightness/contrast adjustment, and binarization. Supports zonal OCR extraction from 70+ file types using specified regions.

### AI-Powered Data Extraction

Extract structured data as JSON from specific document types including bank checks, bank statements, contracts, credit cards, health insurance cards, ID documents, invoices, marriage certificates, mortgage documents, pay stubs, receipts, and tax documents.

### AI Language Processing

Converts speech from audio files to text. Translate files into designated languages.

### Image Processing

Manipulate images including format conversion (JPG, PNG, BMP, TIFF, GIF), cropping, compression, grayscale conversion, image watermarking configurable for size, position, and opacity, text watermarking, enhancing scanned document images by removing noise, lines, and artifacts, photo enhancement, and reading image metadata (EXIF, IPTC, XMP). AI-based OCR can extract and return text content from images.

### Barcode Operations

Generate, scan, and manage barcodes for integration into workflows.

### Excel Automation

Automate a wide range of Excel operations, from data manipulation to advanced calculations. Includes find and replace, removing headers/footers, detecting/removing watermarks, password protection, splitting workbooks by worksheet, and updating rows by filter conditions.

### Word Document Operations

Automate the creation, modification, and conversion of Word documents. Includes merging documents, inserting headers/footers, adding/removing watermarks, find and replace, extracting text/comments/tracked changes, managing tracked changes (accept/reject), compressing files, and removing tables of contents.

### PowerPoint Operations

Handle PowerPoint presentations with advanced capabilities for automating creation, editing, and management of slides.

### Utility Operations

A collection of text, data, and security utilities including: AES encryption/decryption, RSA encryption, hash code generation, HMAC creation, JWT generation, regex search and text splitting, email/URL extraction and validation, date formatting, JSON array manipulation (filter, sort, deduplicate, remove items), and random password/number generation.

### Archive Management

Create and extract ZIP archives.

### Email Processing

The General connector provides actions covering email processing.

### Subscription Management

Returns the current subscription status, plan, and credit usage for monitoring API consumption.

### Queued Operations and Downloads

Processing tools return `operationStatus` and, for queued requests, the provider's
`statusUrl`. Call `get_operation_status` with that URL until the operation is
complete. The lookup also accepts an operation ID, connector, and result type
when the original URL is unavailable. Completed files are available to download.
Existing base64 output fields remain available for compatible workflows.

## API Sources

- [Direct API integration](https://support.encodian.com/hc/en-gb/articles/13253632800284-Direct-API-Integration)
- [Conversion API](https://api.apps-encodian.com/swagger/Conversion/swagger.json)
- [PDF API](https://api.apps-encodian.com/swagger/PDF/swagger.json)
- [General API](https://api.apps-encodian.com/swagger/General/swagger.json)
- [Queued requests](https://support.encodian.com/hc/en-gb/articles/13253819695516-Queuing-requests)

## Events

The provider does not support webhooks or event subscriptions through its REST API. Encodian is a document processing API that performs actions on demand rather than generating events. Note that Encodian Trigr is a separate SharePoint-specific product that provides trigger capabilities within Power Automate flows, but this is not an API-level webhook/event mechanism.
