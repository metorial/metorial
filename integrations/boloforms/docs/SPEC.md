# BoloForms Integration Specification

## Overview

BoloForms (also branded as BoloSign) is an eSignature and forms platform that allows users to create forms, collect electronic signatures on PDFs and form-based documents, manage templates, and automate document workflows. It integrates with Google Workspace (Sheets, Drive, Forms) and offers API access for programmatic document signing and form management.

## Authentication

BoloForms uses API keys for authentication.

**How to obtain an API key:**

1. Log in to the BoloForms Signature dashboard.
2. Click the **Settings** menu on the left bottom of the dashboard.
3. Navigate to the **API Key** section.
4. Click **Generate API Key** to create a new key.

Alternatively, the API key can be accessed directly at: `https://signature.boloforms.com/settings?type=DEV_SEC&subType=APIKEY&copyKey=true`

**How to use the API key:**

The API key is passed as a custom header `x-api-key` in all API requests. The base URL for the API is `https://sapi.boloforms.com/signature/`.

Example header:

```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

There are no OAuth flows, scopes, or additional credentials required beyond the API key.

## Features

### Document Management

Retrieve single-signature PDFs (`PDF`) or PDF templates (`PDF_TEMPLATE`) with optional status, archive, date range, and pagination filters. The `workspaceid` header is required and is supplied by the tool's `workspaceId` input. The public API does not document a workspace-discovery endpoint. Pagination uses whole-number pages from 1 to 10000 and limits from 1 to 100. The API sorts by `createdAt`; legacy `filter`, `query`, and `sortBy` inputs remain available for existing callers.

### Send Templates for Signing

Send documents with pre-filled fields and create templates for future use. You can dispatch a PDF or form template for signing by specifying:

- **Signing type**: PDF template or form template.
- **Receivers list**: An array of recipients with name, email, subject, and message for each.
- **Mail data**: Custom subject and message for the signing email.
- **Document ID**: The ID of the template to send.
- You can batch up to 100 recipients in one request.
- PDF template recipients require unique `roleTitle` values that exactly match template roles; recipient names cannot substitute for role titles.
- For PDF templates, `createdDocumentId` is the respondent Mongo ObjectId used as `responseId` by reminder and void operations.

### Retrieve Template Respondents

Fetch information about who has responded to a PDF template, including signer details and status. Supply `templateId`, `respondentDocumentId`, or both. A direct single respondent object is returned in the tool's `respondents` array.

### Retrieve Form Responses

BoloForms handles form submissions without the need for a server. Retrieve form responses by supplying `formId`, `responseId`, or both. `responseId` can be a Mongo ObjectId or a `formResponseId` UUID. A direct single response object is returned in the tool's `responses` array. Pagination applies when listing by `formId` only.

### Send Signing Reminders

Send reminder emails or SMS to pending signers on a PDF or a PDF template respondent document. For `PDF_TEMPLATE`, provide the template UUID as `documentId` and the respondent Mongo ObjectId as `responseId`. The API permits five reminder requests per 15 minutes per API key and rejects requests for signed, void, expired, declined, or deleted documents. Returned data includes reminded and skipped signers.

### Void Signing Documents

Void an in-progress PDF or PDF template respondent document. The template identifier requirements match reminders. Already-voided documents return a successful response. Signed, paid, declined, expired, and deleted documents cannot be voided.

### Download Signed Documents

Completed respondent records may include a finished PDF URL. This integration retrieves the respondent metadata; it does not expose a separate file-download tool.

### Embeddable Signing

BoloSign provides embed documentation allowing you to embed signing workflows directly into your application.

## API References

- https://bolosign-developer-docs.readme.io/reference/getdocuments
- https://bolosign-developer-docs.readme.io/reference/sendtemplateforsigning
- https://bolosign-developer-docs.readme.io/reference/gettemplaterespondents
- https://bolosign-developer-docs.readme.io/reference/getformresponses
- https://bolosign-developer-docs.readme.io/reference/sendreminder
- https://bolosign-developer-docs.readme.io/reference/voiddocument

## Events

BoloForms supports webhooks for real-time event notifications. Webhooks are configured in the BoloForms dashboard by providing a webhook URL, selecting an event type, and choosing specific documents to track. Webhook payloads are sent as HTTP POST requests in JSON format. Webhook authenticity can be verified using HMAC SHA-256 signatures via the `x-signature` and `x-timestamp` headers.

### Form Response

Triggered when a user completes and submits a form. The payload includes form fields, responses, respondent email, and a URL to the finished PDF.

### Signature Completed (PDF)

Triggered when all signers have completed signing a PDF document. The payload includes document details, signer statuses, and a link to the finished signed PDF.

### Individual Document Viewed

Triggered when an individual signer views a signature PDF document. Includes information about which signer viewed the document and when.

### Individual Document Signed

Triggered when an individual signer completes their signature on a PDF document (before all signers have completed). Includes signer details and signing order information.

### Template Response Completed

Triggered when all responses/signatures are collected for a template-based document. Includes document name, signers with role titles, and a finished PDF URL.

### Individual Template Viewed

Triggered when an individual signer views a template-based document. Includes the viewer's role title and viewing timestamp.

### Individual Template Signed

Triggered when an individual signer completes their signature on a template-based document. Includes signer role title and signing order details.
