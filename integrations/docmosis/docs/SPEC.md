# Slates Specification for Docmosis

## Overview

Docmosis is a template-based document generation service that merges data with templates (DOCX or ODT) to produce documents in formats such as PDF, DOCX, ODT, and TXT. The Docmosis Cloud service is designed to be used primarily via the API, and teams that prefer a self-hosted solution can also consider Tornado, which provides similar API endpoints. This specification covers the Docmosis Cloud (DWS4) REST API.

## Authentication

Docmosis Cloud uses API access key authentication. API access requires a unique access key that Customers can generate and expire.

- **Access Key**: A 62-character alpha-numeric access key that must be included in every API request via the `accessKey` parameter in the request body (JSON or form data).
- **Access keys are environment-specific**: Access Keys are environment-specific, meaning each environment within an account has its own keys.
- **Managing keys**: Access keys are created and managed via the Docmosis Cloud Console under the "API > Access Keys" tab.
- **Base URL / Region**: The "API > Base URLs" tab shows a list of the available processing locations and the corresponding Base URLs. Calls to the API endpoints should use the Base URL that matches the preferred processing location. Available regions are:
  - **US**: `https://us1.dws4.docmosis.com/api/`
  - **EU**: `https://eu1.dws4.docmosis.com/api/`
  - **AU**: `https://au1.dws4.docmosis.com/api/`
- All communication with the Services must be SSL encrypted.

There is no OAuth2 or token-based authentication. All requests are authenticated by passing the `accessKey` field in the POST body.

## Features

### Document Generation (Render)

Merge data with a pre-uploaded template to generate a document. The payload contains the data, the template name, and the output format(s). Calls are synchronous (no polling) and wait while the request is completed. Documents are returned in the response or delivered as instructed.

- Data can be sent as JSON or XML.
- Templates are authored in Microsoft Word (DOCX) or LibreOffice Writer (ODT) with placeholder fields.
- Output formats include Microsoft Word (DOCX), LibreOffice (ODT), PDF, TXT, as well as HTML and XHTML.
- The API offers a Dev Mode that controls whether a document IS generated with errors highlighted in the document (helpful during development), or a document IS NOT generated with an error code and message returned instead (perfect for production).
- Multiple output formats can be requested in a single render call.

### Document Delivery (StoreTo)

Control how generated documents are delivered after rendering. By default, generated documents are returned to the calling application.

- Other delivery options include: delivery via email, stored to an AWS S3 Bucket, and sent using a webhook to third-party services.
- You can even stream, say a PDF whilst emailing a DOC in the single request.
- Delivery via the `storeTo` parameter supports combinations of delivery targets in one request.

### Template Management

The API provides endpoints to upload, download, list and delete templates.

- Templates and supporting images can be uploaded programmatically or via the Cloud Console.
- Templates can be organized in folder structures.
- Templates and other uploaded content are version controlled and can be reverted and restored on an as-needs basis.

### Template Analysis

The API allows you to query the structure of a template and return the field names.

- Useful for dynamically determining what data a template expects before rendering.

### Account and Service Status

The API provides endpoints to check the status of the service and account.

- Query the health/availability of the Docmosis Cloud service.
- Check account-level information such as usage quotas.

### Usage Tracking via Tags

Tags can be applied to render requests (e.g., `Tags=invoice;services`) so that on a monthly basis you can report on the amount of pages and documents generated.

- Useful for tracking and reporting on document generation by category.

## Events

The provider does not support events. Docmosis Cloud is a synchronous document generation API — there are no webhooks, event subscriptions, or polling mechanisms for listening to events. While generated documents can be _sent_ to a webhook URL as a delivery option, this is an outbound delivery mechanism, not an event subscription system.
