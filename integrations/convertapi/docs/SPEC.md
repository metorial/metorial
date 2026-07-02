Now let me check the async conversions and file storage docs for more feature details:Now I have enough information to write the specification.

# Slates Specification for Convertapi

## Overview

ConvertAPI is a cloud-based file conversion and document management REST API service. It supports conversions for more than 300+ file formats including MS Office, Web, AutoCAD, and other tools. Beyond format conversion, it provides document manipulation capabilities such as merging, splitting, encrypting, compressing, watermarking, and text extraction.

## Authentication

ConvertAPI supports two authentication methods, both used via the `Authorization: Bearer` header:

### API Token

API Tokens authenticate conversion requests, differentiate environments, and set consumption limits. Tokens are created and managed from the ConvertAPI account dashboard at `https://www.convertapi.com/a/api-tokens`.

API tokens can be limited to a specific amount of conversions or expire after a specific duration. You can create multiple tokens per account, making it easy to restrict consumption per token and distribute purchased conversions between multiple environments or customers.

Usage:

```
Authorization: Bearer <api_token>
```

### JWT Token

You can either self-sign a JWT token or use ConvertAPI's JWT Generator endpoint. When authenticating conversions, you can use an API token directly, or generate a short-lived JWT token signed with your API Token. JWT tokens are useful for client-side or browser-based usage where you don't want to expose the long-lived API token directly.

Usage:

```
Authorization: Bearer <jwt_token>
```

## Features

### File Format Conversion

Convert files between 300+ formats including PDF, DOCX, XLSX, PPTX, HTML, JPG, PNG, and many more. Create PDFs and images from various sources like Word, Excel, PowerPoint, images, web pages, or raw HTML codes. Files can be provided via file upload, URL, or file ID reference. Each conversion type supports format-specific parameters (e.g., PageSize, PageOrientation, Quality, ImageWidth, ImageHeight).

### PDF Document Toolkit

A comprehensive PDF document toolkit allows you to generate, modify, compress, protect, and prepare documents for sharing and long-term storage. Capabilities include:

- Merge, encrypt, split, repair, and decrypt PDF files.
- Watermarking with text, images, or other files.
- Compress, repair, flatten, or rasterize documents and convert them to PDF/A for compliant archiving.
- Redaction of sensitive information.

### Data Extraction

Extract images, attachments, textual, tabular, and form data from PDF documents and emails. Text extraction supports OCR for scanned documents.

### Document Generation

Dynamically generate DOCX and PDF documents using a Word template, import/export PDF form data, and generate advanced PDF documents using HTML + JSON.

### Document Security

Encrypt and protect documents (PDF, DOCX) with password and AES 256-bit encryption. Decrypt password-protected files.

### Conversion Workflows (Chaining)

Apply multiple conversions to a file stored on ConvertAPI's server. You can process the file over and over again by calling the appropriate conversion methods via the REST API, with no need to download a partial result and re-upload it. Requires setting `StoreFile=true` to keep intermediate results on the server.

### Temporary File Storage

The ConvertAPI File Server is a temporary file cache that can be optionally used for file converters. It offers several benefits that simplify and expedite conversion requests, allowing for the reuse of files, enabling conversion chaining, and providing flexibility in downloading result files. Stored result files are automatically removed after three hours. Files can also be manually deleted via a DELETE request.

### Asynchronous Conversions

Asynchronous file conversions are made by setting the `/async` path prefix. The response of the asynchronous conversion contains the JobId parameter, which can be used to get the conversion result. Results can be retrieved by polling with the JobId, or by receiving a webhook notification upon completion.

### Converter Discovery

ConvertAPI provides several info endpoints that enable you to retrieve data about supported file conversions, parameters, and formats. These endpoints allow you to dynamically configure converters, ensuring your application always reflects the most up-to-date capabilities. You can query which source formats convert to a given destination format, and vice versa.

### Account & Usage Information

Track conversion usage and monitor API performance by calling the `/user` endpoint. Returns data such as total conversions available and conversions consumed.

### Region Selection

You can choose from multiple conversion locations, including the EU API location for GDPR compliance. This selection is optional as ConvertAPI automatically detects the nearest server using GEO DNS. Alternative base URIs (e.g., `https://eu-v2.convertapi.com/`) can be specified for region-specific processing.

## Events

ConvertAPI offers a limited webhook mechanism specifically for asynchronous conversions:

### Async Conversion Completion Webhook

ConvertAPI uses WebHooks to push notification about conversion completion. When the conversion is completed, the WebHook URL is requested using the POST method with the JobId in the request body. To receive a push notification, provide the `WebHook` query parameter when making an async request.

- **Parameter:** `WebHook` — a URL that ConvertAPI will POST to when the conversion job finishes.
- The POST body contains the `JobId`, which is then used to retrieve the actual conversion result.
- This is only available for asynchronous conversions (those using the `/async` path prefix).

ConvertAPI does not provide a general-purpose event subscription system or webhooks for account-level events.
