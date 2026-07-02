Let me get more details on the webhook functionality and the document generation/security features.Now I have enough information to write the specification.

# Slates Specification for Pdf4me

## Overview

Pdf4me is a cloud-based document processing API that provides capabilities for PDF and document manipulation, including format conversion, merging, splitting, OCR, barcode generation, data extraction, digital signatures, and form processing. It is an enterprise-grade REST API solution that delivers document processing capabilities including conversion, manipulation, barcode generation, and data extraction.

## Authentication

Pdf4me uses **API Key authentication**. Every request must include proper authentication credentials to ensure secure communication and validate your identity as an authorized user.

The API key is passed via the `Authorization` header on each request:

```
Authorization: [Your API Key]
```

API keys are obtained by registering at dev.pdf4me.com and accessing the dashboard. There are two types of API keys based on your API subscription or API purchase: one from the developer portal (dev.pdf4me.com) for monthly subscriptions, and one from pdf4me.com for prepaid call packages.

All communications are strictly conducted over HTTPS. Unsecured HTTP connections are not permitted.

The base endpoint for API V2 is: `https://api.pdf4me.com/v2/`

Additionally, Pdf4me has two connector types for no-code platforms: PDF4me Connect (requires API Key) and PDF4me (direct authentication using account credentials via OAuth).

## Features

### Document Conversion

Convert between PDF and various document formats including Word, Excel, PowerPoint, HTML, and images. Convert any type of office documents or images into PDFs. Also supports converting URLs to PDF. Conversions preserve formatting and quality.

### Merge and Split

Merge multiple PDF files into a single PDF in the desired order. Split PDF files using unique text, page numbers, or even using text embedded in barcodes contained in them. Also supports overlaying one PDF on another.

### Page Organization

Compress, rotate, or remove pages from PDF files. Extract specific pages, delete blank pages, add margins, add page numbers, and crop pages.

### OCR (Optical Character Recognition)

Pdf4me employs one of the most advanced OCR engines to recognize text in images and document scans to enable data extraction. Can create searchable PDFs from scanned documents. Supports find-and-replace operations on text within documents.

### Barcode and QR Code

Supports 150+ barcode types including QR codes, Code128, DataMatrix, Aztec, Hanxin, PDF417, and specialized formats. Create standalone barcode images, add barcodes to existing PDFs, and read barcodes from documents. Can generate compliant Swiss QR codes for bills. Configurable positioning, size, opacity, and text visibility.

### Stamps and Watermarks

Create and apply watermarks — both text and image — to PDF files. Control position, color, transparency, and more. Add headers and footers with HTML content.

### Data Extraction

Extract text and/or embedded images from a PDF. Also supports extracting tables, attachments, and other resources. The Parse Document API extracts structured data from a PDF using a template you create in the PDF4me dashboard. Templates define capture areas and regular expressions for recurring document types like invoices and forms.

### Document Classification

Classify or identify documents based on the file content. Can be combined with document parsing to route documents by type and apply the appropriate extraction template.

### Document Generation

Generate dynamic documents using Pdf4me's Word template engine to create data-driven documents. Supports mail merge with JSON data, dynamic tables, and merge fields. Automate contracts, invoices, and reports with dynamic PDF templates. Also supports filling PDF forms.

### PDF/A Compliance

Use the PDF/A feature to generate compliant PDFs for long-term archiving and prevent data tampering.

### PDF Security

Protect sets password or removes password from a document. It also allows customization of permissions to be set while locking the document with password. Supports both owner and user passwords. Protect your files with passwords, eSignatures, or lock/unlock options.

### PDF Optimization

Compress and optimize PDF files for different purposes. Optimize PDF files for displaying on web pages or for print jobs. Also supports image compression.

### Image Processing

Convert PDF pages to images (thumbnails), convert image formats, crop images, compress images, and add text or watermarks to images.

### PDF Editing

Add stamps, attachments, and signatures to PDFs. Edit PDF metadata, flatten fillable PDFs to make them read-only, redact content, and repair damaged PDF files.

### Workflows

Users can create reusable document processing workflows in the Pdf4me dashboard. Execute Pdf4me Workflow from a list of user-created Workflows. Workflows chain multiple processing steps together.

## Events

The provider does not support events. Pdf4me is a stateless document processing API where operations are request/response based. There is no native webhook subscription mechanism or event system for listening to changes or notifications from the Pdf4me platform.
