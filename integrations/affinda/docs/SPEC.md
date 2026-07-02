# Slates Specification for Affinda

## Overview

Affinda is an AI-powered intelligent document processing (IDP) platform that extracts structured data from documents such as resumes, invoices, bank statements, passports, and bills of lading. It turns any incoming document into clean, structured JSON. The API is organized around three core primitives: Workspaces (logical project containers), Document Types (model configurations for specific document kinds), and Documents (uploaded files with their extracted data).

## Authentication

Affinda's API uses basic authentication with API keys. Each Affinda user will have their own API keys to manage within their user profile settings.

- **Type**: Bearer Token (API Key)
- **Header**: `Authorization: Bearer <API_KEY>`
- **Base URL**: `https://api.affinda.com/v3/`
- **Obtaining a key**: Create an Affinda account and log in to the dashboard, then generate an API key via Settings → API Keys.
- API keys are not associated with an Organization. Each API key is only viewable once when created for security purposes. Users should copy their API keys and store them securely.
- You can generate a maximum of three API keys within the Affinda app.
- A **Workspace Identifier** is also required for most operations. Retrieve it from Workspace → Workflow → Integrations in the dashboard.

## Features

### Document Parsing & Data Extraction

Upload documents (PDF, DOCX, JPG, PNG, TXT, HTML, and more) and receive structured JSON data extracted by AI models. The same endpoint handles different document types — just swap the document type ID. Documents can be uploaded via file, URL, or email attachment. The `wait` parameter controls whether the response is returned after parsing completes or immediately.

- Supports pre-built extractors for resumes, invoices, job descriptions, bank statements, passports, and more.
- The resume parser recognises over 100 fields across 56 languages.
- Custom document types can be defined with configurable extraction fields.

### Document Classification

Document classification automatically identifies and categorizes documents based on their content. In the Affinda platform, this ensures documents are correctly categorized into their relevant type, enabling targeted downstream extraction and validation.

- When enabled, Affinda will classify and route each document to the relevant Document Type when uploaded to a Workspace.
- Workspaces can be configured to automatically reject documents that are not of the right type, sending them to a 'Rejected' list for review.
- The classification model is self-learning and improves over time based on document type names, descriptions, and confirmed examples.

### Data Validation

Data points and the document itself can be validated automatically using configurable rules. Documents that meet the requirements will be auto-validated and skip the human validation step.

- For documents not auto-validated, users can review predictions using a validation interface to correct and confirm extracted data.
- Validation results can be created and managed via the API.

### Resume Redaction

Affinda offers the ability to select different fields to redact from resumes. Options include personal details (name, address, phone number, email), work details (company name), education details (university name), and more. One or many of these options can be included in the API request.

- Additional redaction options include headshots, referees, locations, dates, gender, and PDF metadata.
- Returns a redacted PDF file.

### Search & Match

Using the outputs from Affinda's Resume Parser and Job Description Parser, the Search & Match solution uses an advanced algorithm to return a ranked shortlist of the most relevant jobs or candidates for a given search query.

- Match resumes against job descriptions or vice versa.
- Reverse match functionality — search job descriptions with a resume, or with a set of parameters.

### Workspace & Organization Management

Manage organizations, workspaces, and collections programmatically. A Workspace is where documents are processed and can contain one or many collections of documents. It can also have restricted access to only permitted users within your Organisation.

- Create, update, and delete workspaces and collections.
- Manage organization members and settings.
- Tag documents for organization and filtering.

### Annotations Management

Batch update or modify multiple document annotations in a single request, allowing programmatic correction of extracted data points.

## Events

Affinda supports webhooks (called "resthooks") for event-driven integrations. Webhooks allow extracted data to be pushed to you when an event occurs (e.g., document parsed or document validated), instead of having to constantly poll the API.

Webhooks can be created at an Organization or Workspace level. Subscriptions are created via the API by specifying a target URL, an event type, and an organization or workspace identifier. Webhook payloads include an `X-Hook-Signature` header for verification using SHA256 signing with a configurable signature key.

### Document Parse Completed

Triggered when a document has finished being parsed by the AI model. The event name is `document.parse.completed`. The payload contains document metadata (identifier, file info, workspace, collection) which can be used to retrieve the full parsed data.

### Document Validate Completed

Triggered when a document has been validated, either automatically via rules or manually by a user. The event name is `document.validate.completed`. In some cases this will be when the document is finished parsing, but in other use cases this may be when the document has been validated.
