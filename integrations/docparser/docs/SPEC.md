# Slates Specification for Docparser

## Overview

Docparser is a document data extraction service that pulls structured data from PDFs, Word documents, and image-based documents using Zonal OCR, pattern recognition, and anchor keywords. Users create "Document Parsers" that define extraction rules, then import documents for automated parsing and data retrieval.

## Authentication

Docparser uses a secret API key linked to your account. The API key can be obtained and reset in the API Settings of your Docparser account at `https://app.docparser.com/myaccount/api`.

Authentication can be performed in two ways:

1. **HTTP Basic Auth (recommended):** Use your secret API key as the username and leave the password blank.
   - Example: `-u YOUR_SECRET_API_KEY:`

2. **API Key in request:** Provide the API key directly as:
   - A request header: `api_key: YOUR_SECRET_API_KEY`
   - A POST field: `api_key=YOUR_SECRET_API_KEY`
   - A URL query parameter: `?api_key=YOUR_SECRET_API_KEY`

All requests must be made over HTTPS. You can verify authentication by calling `GET https://api.docparser.com/v1/ping`, which returns `{"msg": "pong"}` on success.

There are no OAuth flows or scopes. A single API key provides full access to all parsers and documents in the account.

## Features

### Document Parser Management

List all Document Parsers in your account along with their IDs and labels. You can also list Model Layouts (templates) configured within a specific parser. Parser IDs are required for most other API operations.

### Document Import

Import documents into a specific Document Parser for processing. Three import methods are supported:

- **File upload:** Upload a file directly via multipart form-data.
- **Base64 content:** Send file content as base64-encoded data along with an optional filename.
- **Fetch from URL:** Provide a publicly accessible URL from which Docparser will retrieve the document.

All import methods accept an optional `remote_id` parameter — an arbitrary string that stays associated with the document through processing and is included when retrieving parsed data, useful for correlating results with records in your own system.

### Document Status Tracking

Check the processing status of a specific document, including timestamps for upload, import, OCR, preprocessing, parsing, and webhook dispatch. Failed processing jobs are listed in the response.

### Parsed Data Retrieval

Retrieve structured data extracted from documents. Data can be fetched for a single document or for multiple documents from a parser. Results include parsed fields, metadata (filename, page count, timestamps), media links, and the optional `remote_id`.

- **Format options:** Results can be returned as nested JSON objects or as flat key/value pairs.
- **Filtering:** Results for multiple documents can be filtered by upload date, processing date, or `remote_id`.
- **Sorting:** Results can be sorted by various timestamp fields in ascending or descending order.
- **Child documents:** If a document was split during preprocessing, child document data can be included.

### Re-Parse and Re-Integrate

- **Re-parse:** Schedule previously imported documents to be parsed again (e.g., after updating parsing rules).
- **Re-integrate:** Schedule documents to be re-sent through configured integrations and webhooks.

Both operations accept an array of document IDs.

## Events

Docparser supports webhooks — custom HTTP requests triggered each time a new document is parsed. The request is sent to a specific HTTP endpoint you define, and webhooks fire immediately after parsing completes.

### Document Parsed

Triggered when a document has been fully processed and parsed data is available. This is the only event type.

- **Simple Webhooks:** You define a target URL and choose the data format (Form Data, JSON, or XML).
- **Advanced Webhooks:** Provide full control over the HTTP request with a Handlebars-based template editor for custom payloads.

Configuration options for Advanced Webhooks:

- **Data granularity:** By default, all parsed data for one document is sent in a single request. For tabular data (e.g., line items), you can opt to send one HTTP request per parsed table row.
- **HTTP method:** POST by default, but can be set to GET, PUT, or DELETE.
- Custom HTTP headers and Basic Auth credentials can be configured.
- The payload template supports Handlebars expressions with replacement patterns derived from your parser's fields.
