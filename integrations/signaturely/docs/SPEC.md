Let me try to access the actual Signaturely API docs more thoroughly.Now I have a good picture. Let me compile the specification based on what I've found.

# Slates Specification for Signaturely

## Overview

Signaturely is a cloud-based electronic signature platform that allows users to upload documents, add signature fields, and send them to one or multiple signers for legally binding electronic signatures. It supports templates, team collaboration, audit trails, and document management, with compliance to major e-signature laws including the US ESIGN Act and EU eIDAS regulation.

## Authentication

Signaturely supports two authentication methods:

### API Key

- Available on all API plans (Gold, Platinum, Titanium).
- API keys can be generated from the Signaturely settings page at `https://app.signaturely.com/settings/api`.
- You can create an unlimited number of API keys per account.
- A free API key can be created from the documentation page for testing purposes.
- The API key is included in requests to authenticate against the Signaturely API.

### OAuth

- Available only on Platinum and Titanium API plans.
- OAuth is used to allow third-party applications to access Signaturely on behalf of users, following the standard OAuth access delegation model.
- Specific OAuth endpoints and configuration details are available in the [Signaturely API documentation](https://docs.signaturely.com/).

## Features

### Signature Requests

Send automated signature requests to one or multiple signers via the API. Documents can be sent for signing directly from your CRM or other platforms. The number of requests allowed depends on the API plan (50, 150, or 500 per month).

### Templates

Access and use pre-built document templates through the API. Templates support configurable roles (e.g., "Receiving Party", "Disclosing Party"), customizable field placements (signatures, initials, dates, textboxes, checkboxes), and adjustable message/name settings per request. Templates must be created in the Signaturely dashboard before being used via the API. The number of available templates depends on the plan (5, 25, or unlimited).

### Embedded Signing

Embed signature requests directly within your own application or website, allowing signers to complete the signing process without leaving your platform. Available only on Platinum and Titanium API plans.

### Embedded Requesting

Allow users to create and send signature requests from within your application, without needing to open the Signaturely platform. Available only on Platinum and Titanium API plans.

### Personalized Branding

Customize the signing experience with your own branding. Available on Platinum and Titanium API plans. The Titanium plan additionally supports full white-labeling.

### Document Management

Retrieve and manage documents, track signing status (signed, unsigned, pending), and download completed signed documents with audit trails.

## Events

Based on available information, Signaturely does not appear to offer a native webhook or event subscription system through its API. However, Signaturely provides a Zapier integration that exposes the following event triggers:

- **Document Completed**: Fires when a document has been fully signed by all parties.
- **Document Sent**: Fires when a document has been sent out for signing.
- **Document Viewed**: Fires when a signer views the document.

These triggers are available through Zapier and can be used to automate downstream workflows. It is unclear whether Signaturely exposes direct webhook endpoints outside of the Zapier integration, as the API documentation portal (docs.signaturely.com) requires JavaScript rendering and detailed endpoint-level documentation could not be fully confirmed.
