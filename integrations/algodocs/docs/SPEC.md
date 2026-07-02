Now let me check for more details on the AlgoDocs webhook support and the help documentation about exporting data.I now have enough information to write the specification. Let me compile everything.

# Slates Specification for Algodocs

## Overview

Algodocs is an AI-powered document data extraction platform that extracts structured data (fields and tables) from PDFs, images, Word, and Excel documents. It uses OCR, pre-trained models, custom extractors, and prompt-based extraction to convert unstructured documents into structured output, supporting over 200 languages.

## Authentication

Algodocs supports two authentication methods. Both require a secret API key obtained from your Algodocs account settings.

**1. Basic Authentication**

Pass your registered email address and API key using HTTP Basic Auth, encoded as `base64('<email_address>:<api_key>')`.

Example:

```
curl https://api.algodocs.com/v1/me --user '<email_address>:<api_key>'
```

**2. API Key Authentication**

Pass only your API key via the `x-api-key` header.

Example:

```
curl https://api.algodocs.com/v1/me -H 'x-api-key: <api_key>'
```

To use the API, you need a secret API key. Register at https://algodocs.com/register to get your own API key. The API key can be obtained from your AlgoDocs account settings.

You can verify your authentication using the `GET https://api.algodocs.com/v1/me` endpoint, which returns your full name and email address.

## Features

### Extractor Management

List all extractors configured in your Algodocs account. Each extractor has an id and name, and the id is used in subsequent API calls for uploading documents and retrieving extracted data.

### Folder Management

List all folders in your account. Folders have a hierarchical structure with id, parentId, and name fields. Folders are required when uploading documents.

### Document Upload

Upload documents to Algodocs for processing. Three upload methods are supported:

- **Local file upload**: Upload a local file directly to AlgoDocs by providing the file content along with an extractor ID and folder ID.
- **URL upload**: Upload a file by fetching it from a publicly available URL.
- **Base64 upload**: Upload a file in base64 string format, providing both the base64 content and a filename.

Accepted file types include PDF, PNG, JPG/JPEG, Word (.doc, .docx), and Excel (.xls, .xlsx).

### Extracted Data Retrieval

Retrieve structured data extracted from processed documents in two ways:

- **By document ID**: Returns extracted data for a single document. When a document is split into multiple documents (e.g., when extraction rules apply to each page independently), the returned data will have multiple records. The data is always returned as a list.
- **By extractor ID**: Retrieve extracted data across multiple documents for a given extractor. Optional parameters include folder_id, limit, and date to filter results (e.g., documents uploaded during the last 10 days).

Each record contains system-generated fields (id, documentId, uploadedAt, fileName, etc.) plus user-defined fields from the extractor rules, such as InvoiceNumber, Date, and Amount.

### Data Export

Extracted data can be exported in multiple formats including Excel, JSON, and XML. Custom Excel template export is also supported, allowing mapping of extracted data into a user-defined Excel layout.

## Events

The Algodocs API itself does not provide a native webhook registration or subscription mechanism. The help documentation mentions webhooks or API pulls for obtaining extracted data, but no dedicated webhook configuration endpoints are documented in the API reference.

Through Zapier, Algodocs offers a trigger that fires when a new document is processed and extracted data is available. An additional Zapier trigger fires when extracted table row data is available. However, these are Zapier-specific polling mechanisms, not native webhook events exposed by the Algodocs API.

The provider does not support native webhook/event subscriptions through its API.
