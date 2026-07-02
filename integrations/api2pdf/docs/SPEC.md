# Slates Specification for API2PDF

## Overview

API2PDF is a REST API for PDF generation, document conversion, and file transformation. It supports HTML to PDF, URL to PDF, HTML to image, URL to image, Microsoft Office document conversion, email and image file conversion, PDF page extraction, PDF password protection, file zipping, barcode and QR code generation, markdown conversion, structured PDF data extraction, and image previews or thumbnails for PDF, office, and email files. It is built on engines including wkhtmltopdf, Headless Chrome, PdfSharp, LibreOffice, and related tools.

## Authentication

API2PDF uses API key authentication. Create an account at portal.api2pdf.com to get your API key.

The API key can be provided via either query string or Authorization header authentication methods.

When using the Authorization header, pass the API key directly as the header value (not as a Bearer token):

```
Authorization: your-api-key
```

The base URL for the API is `https://v2.api2pdf.com`. An XL cluster is also available at `v2-xl.api2pdf.com` which provides larger compute resources for heavier workloads, at additional cost.

## Features

### PDF Generation from HTML and URLs

Convert raw HTML or a publicly accessible URL into a PDF document. Supports Markdown, HTML, and URLs to PDF using Headless Chrome. Also available via the wkhtmltopdf engine as an alternative renderer. Configurable options include landscape orientation, custom headers/footers, page size, margins, and extra HTTP headers for authenticated source URLs.

### Screenshot / Image Capture

Capture a website, URL, or raw HTML as a screenshot when PDF is not the deliverable. Uses Headless Chrome for rendering.

### Office Document Conversion

Convert Word, PowerPoint, Excel, and images into PDF with LibreOffice. Also supports converting HTML to Word (DOCX), HTML to Excel (XLSX), and PDF to HTML. Any file format that LibreOffice can open is supported as input.

### PDF Merging

Combine multiple PDFs into a single document through a simple API call. Provide URLs to the PDFs to be merged.

### PDF Page Extraction and Reordering

Splice specific page ranges out of existing PDFs. Specify start and end pages to extract a subset of a PDF. Pages can also be reordered.

### PDF Password Protection

Lock an existing PDF with a password for compliance or customer-facing delivery. Supports setting both owner and user passwords.

### Thumbnail and Image Preview Generation

Create thumbnails from PDFs and Office documents for previews and gallery views. Also works with email files.

### Barcode and QR Code Generation

Generate QR and barcodes for labels, invoices, and shipping workflows. Configurable parameters include format (e.g., QR_CODE), value, width, height, and whether to show a label.

### Markdown Conversion

Convert Markdown content to PDF.

### Structured PDF Data Extraction

Extract structured data from existing PDF documents for automated content processing.

### File Zipping

Compress multiple files into a single ZIP archive.

### File Management

By default, API2PDF will delete your generated file 24 hours after it has been generated. For those with high security needs, you can delete your file on command using the responseId returned from the original request.

## Events

The provider does not support events.
