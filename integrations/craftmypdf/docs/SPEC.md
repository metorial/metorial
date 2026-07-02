Let me get more details on the API reference to understand the full feature set.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Craftmypdf

## Overview

CraftMyPDF is a cloud-based service for generating PDF documents and images (JPEG/PNG) from reusable templates and JSON data. It provides a cloud-based API for generating PDF documents or images, supporting both synchronous and asynchronous generation. It also supports creating fillable PDF forms with components such as text boxes, checkboxes, dropdown menus, radio buttons, and signature fields.

## Authentication

CraftMyPDF uses **API key** authentication. CraftMyPDF uses API keys to authenticate your account.

- The API key is passed via an HTTP header: `X-API-KEY: <your_api_key>`.
- The API Key is used to create PDFs or manage templates. You may find the API Key on the API Integration page in the CraftMyPDF dashboard.
- Log into your CraftMyPDF account, and in the dashboard API Integration tab, click Copy to clipboard.

The base API URL is `https://api.craftmypdf.com/v1/`. Regional API endpoints are available for customers who want data processed in a specific region, with endpoints in the US, EU (Germany), Singapore, and Australia.

## Features

### PDF Generation

Generate PDF documents by combining a pre-defined template with JSON data. PDFs are generated from templates and JSON data. Key options include:

- Specifying a template ID and providing JSON data to populate it.
- Choosing export type: `json` (returns a URL to the generated PDF on a CDN) or `file` (returns binary data directly).
- Setting an expiration time for generated PDFs (1 minute to 24 hours).
- Enabling CMYK color profile for print-ready output.
- Password protection for generated PDFs.
- Configurable PDF standards: PDF1.7, PDFA1B, PDFA2, PDFA3.
- Image resampling resolution control.
- Optional cloud storage integration (e.g., AWS S3).
- Data can be loaded from an external URL instead of being passed inline.

### Image Generation

Besides PDF documents, CraftMyPDF offers an image generation API to generate images (JPEG/PNG). Uses the same template system as PDF generation but outputs image files.

### Multi-Template PDF Merging

Create a PDF file from multiple templates and merge all the PDFs into one. Supports configuring paging behavior—either continuous page numbering across merged documents or resetting page numbers for each document.

### PDF Merging by URL

Merge multiple PDF URLs into a single PDF document. Accepts a list of PDF URLs and combines them into one output file.

### PDF Watermarking

Add a text watermark to an existing PDF. Configurable options include font size, opacity, rotation angle, color (hex), and font family.

### Template Management

Manage PDF templates programmatically:

- **List templates**: Retrieve all available PDF templates.
- **Create template**: Create a new template by cloning an existing one.
- **Update template**: Update a template's name or sample JSON data.
- **Delete template**: Remove a template.
- Every template has a unique identifier, and the API must know which template to use to generate a PDF.

### Editor Sessions (White-label Embedding)

Create an iframe page using the REST API to create an editor session—a unique URL for embedding the PDF template editor in an iframe. Configurable options include:

- Permissions: save, generate PDF, view settings, preview, edit JSON.
- Session expiration (default 24 hours).
- JSON editor mode (editor vs. viewer).
- Custom back button URL.
- Toggle CraftMyPDF header visibility.

### Account Information

Retrieve account details and usage information.

### Transaction History

List all PDF generation transactions for tracking and auditing purposes.

## Events

CraftMyPDF supports asynchronous PDF generation with webhooks. When using asynchronous PDF generation, the action returns immediately, and once the PDF is ready, it is sent to a webhook URL.

### Asynchronous PDF Generation Completion

When a PDF is generated asynchronously, CraftMyPDF sends a callback to a user-specified webhook URL upon completion.

- The webhook receives the transaction reference, file URL, and status.
- The webhook URL is provided as a parameter when initiating the asynchronous PDF generation request.
- Additional data can be appended to the webhook URL as query string parameters (e.g., email address for downstream processing).

This is the only event mechanism available. CraftMyPDF does not support general-purpose event subscriptions or webhook registrations for other event types (e.g., template changes or account events).
