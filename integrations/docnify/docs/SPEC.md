I found that Docnify (not Doctify or Docify) is a company that helps SMBs with information collection, data workflows, and e-signatures. Let me search more specifically.Good, I found some useful info about Docnify from Pipedream. Let me get more details from the Pipedream integration page and the Docnify website directly.Let me look at the Docnify website directly and try Pipedream's documentation for more details.Now let me get more details about Docnify specifically, since the searches kept mixing it with other tools. Let me check the Pipedream Docnify page more closely and the Docnify API docs.Now I have a good understanding of Docnify. Let me compile the specification based on what I've found.

From the research:

- **Docnify** is a cloud-based e-signature and document management platform for SMBs
- **Authentication**: API token + custom URL (instance-specific), passed as `Authorization` header
- **API base**: `{url}/api/v1/documents` (v1 API)
- **Actions**: Add Recipient To Document, Create Document From Template, Send Document for signing
- **Events/Triggers**: New Document Completed (signed by all recipients), New Document Created, New Document Signed (by a recipient)
- These events are implemented via polling (checking document list by updatedAt), not webhooks

# Slates Specification for Docnify

## Overview

Docnify is a cloud-based platform that enables small- and medium-sized businesses to create, send, and manage electronic document signatures. It helps businesses collect information, automate data workflows, and sign on various devices. It provides a platform for creating, sending, and managing legally valid electronic and digital document signatures.

## Authentication

Docnify uses API token authentication combined with an instance-specific URL.

To authenticate, you need two credentials:

1. **API Token**: An API token generated from your Docnify account. The token is passed in the `Authorization` header of each request.
2. **Instance URL**: Your Docnify instance URL (e.g., `https://your-instance.docnify.com`). This is required because Docnify deployments may be hosted at different URLs.

API requests are made to `{url}/api/v1/...` endpoints, with the `Authorization` header set to the API token value.

Example request:

```
GET {your-instance-url}/api/v1/documents
Authorization: {your-api-token}
```

## Features

### Document Management

Retrieve and manage documents within your Docnify account. You can track when new documents are created and view document details including recipient information and signing status.

### Template-Based Document Creation

Create new documents from pre-existing templates. Templates allow you to define reusable document structures that can be populated and sent to recipients for signing. This is the primary method for programmatically generating documents.

### Recipient Management

Add recipients to existing Docnify documents. Recipients are the individuals who need to sign or interact with a document. Each recipient has associated metadata such as email, name, and signing status (including a `signedAt` timestamp).

### Document Sending

Send a document within Docnify for signing. Once a document has been created and recipients have been assigned, the document can be dispatched to recipients for their signatures.

## Events

Docnify does not natively support webhooks. However, the following document lifecycle events can be monitored through a polling mechanism against the documents API:

### New Document Created

Fires when a new document is created in the Docnify account. Tracked via the document creation timestamp.

### New Document Signed

Fires when a document is signed by a recipient. This event tracks individual recipient signatures by monitoring the `signedAt` field on recipients, detecting when a specific recipient has newly signed.

### New Document Completed

Fires when a document is signed by all recipients. This indicates the document workflow is fully complete, with every assigned recipient having provided their signature.
