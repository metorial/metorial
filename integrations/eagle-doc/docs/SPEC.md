Now let me get more details on the authentication and specific API endpoints for Eagle Doc (eagle-doc.com):Now let me check the batch OCR and human feedback endpoints for completeness:Now I have enough information to write the specification.

# Slates Specification for Eagle doc

## Overview

Eagle Doc is an AI-powered document processing service by S2Tec GmbH (Germany) that provides OCR APIs for extracting structured data from various document types including invoices, receipts, bank statements, resumes, passports, ID cards, and more. It supports intelligent data extraction from any document type in over 40+ languages and returns results as structured JSON.

## Authentication

Eagle Doc uses **API key authentication**. The API key is passed in the request header as `api-key`.

- **Header name:** `api-key`
- **How to obtain:** Register for a subscription on the Eagle Doc pricing page. The API key is provided with your subscription and can be managed from the Eagle Doc dashboard.
- **Base URL:** `https://de.eagle-doc.com` (hosted in Frankfurt, Germany). Enterprise customers can request dedicated instances or specific geographic locations.

Example request:

```
POST https://de.eagle-doc.com/api/invoice/v1/processing
Headers:
  api-key: YOUR_SECRET_API_KEY
```

There are no OAuth flows, scopes, or additional credentials required. All requests are authenticated solely via the API key header.

## Features

### Invoice OCR Processing

Extract structured data from scanned or digital invoices. The invoice processing API extracts all relevant data from scans or photos of paper or digital invoices, including sender and receiver address, line items, tax details, total price and more. Supports both file upload (form-data) and base64-encoded input. Extracted fields include document type (Invoice or CreditMemo), general info (shop/customer details, invoice number, dates, VAT number, etc.), line items, tax breakdowns, payment methods, bank details (BIC/IBAN), QR codes, and signatures.

- **Options:** Privacy mode (opt out of server-side file storage), polygon coordinates for text location, full text extraction for searchability, and optional signature extraction.

### Receipt OCR Processing

Extract all relevant data from scans or photos of paper or digital receipts, including shop information, line items, tax details, total price and more. The output structure is similar to invoices.

### Finance OCR Processing (Unified Receipt/Invoice)

Automatically classify and extract data from a receipt or invoice without needing to specify the document type upfront. The API figures out what type of document it is, so your app doesn't have to call different endpoints for different document types.

### Any Document OCR Processing

Extract structured data from any document type in any language. Supported document types include: BankStatement, TravelTicket, Passport, BusinessCard, EmployeeIDCard, StudentIDCard, DrivingLicense, BirthCertificate, DeliverySheet, and Resume. Each document type returns type-specific structured fields (e.g., bank statements return account details and transaction lists; resumes return work experience, education, and skills).

- **Options:** Specify a `docType` to get targeted extraction, or omit it to let the API auto-classify. Use a `configId` for custom extraction configurations provided by the Eagle Doc team.

### Document Splitting

Split a multi-page document (e.g., a PDF containing multiple separate documents) into individual documents.

### Signature Extraction

Extract signatures from any document. Returns base64-encoded signature images, bounding box coordinates, page numbers, and confidence scores.

### Batch Document Processing

Process multiple documents at once asynchronously when you do not need the result immediately. Submit a batch task, then poll for status and results using a task ID. Available for both finance documents (receipts/invoices) and any-doc types. Tasks progress through statuses: Received → Processing → Finished (or Error). Tasks and their results can also be deleted.

### Human Feedback

Provide feedback on document extractions so that future extractions improve over time. This allows you to correct or confirm extracted data to train the algorithm.

### Usage Monitoring

Monitor your API usage quota through dedicated APIs. Check remaining quota for different processing types (e.g., receipt, invoice).

## Events

The provider does not support events. Eagle Doc is a request-response document processing API with no webhook or event subscription mechanism.
