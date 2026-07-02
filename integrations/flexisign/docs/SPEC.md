I can see there are two different products called "Flexisign" — one is the SAi sign-making software and the other is the e-signature platform at flexisign.io. Based on the context of an integration platform (Slates), the relevant one is **FlexiSign** (flexisign.io), the e-signature platform with an API. Let me get more details about their API.Now let me look at the Pabbly integration page more carefully to understand the available triggers and actions for FlexiSign:Now I have a solid understanding. Let me compile the specification based on the research.

# Slates Specification for Flexisign

## Overview

FlexiSign is a digital signature platform that simplifies how you sign, send, and manage documents. It is SOC 2, ISO 27001, GDPR, and HIPAA compliant. Users can choose from 24 global data centers for document storage to ensure compliance with local regulations.

## Authentication

FlexiSign uses API keys for authentication.

To authenticate API requests, include the API key in the request headers:

- **Header name:** `api-key`
- **Header value:** Your FlexiSign API key

The API key can be obtained from the FlexiSign application under the integrations section. The base URL for API requests is `https://api.flexisign.io/v1/`.

Example header:

```
api-key: your_api_key_here
```

No OAuth flow or additional scopes are required. There is no tenant or subdomain configuration needed — all accounts use the same base URL.

## Features

### Template Management

Retrieve and manage reusable document templates. Users can save frequently used documents as templates and share them with team members within the platform. The API allows listing all templates and retrieving a specific template by its ID.

- Templates are created and configured (with signature fields, recipient roles, etc.) via the FlexiSign web application.
- The API provides read access to template metadata for use in document creation workflows.

### Document Creation and Signature Requests

Send signature requests to specified recipients for documents generated from templates. The API allows creating documents that can be sent to one or more recipients for signing.

- Documents are generated from pre-configured templates.
- Recipients (signers) are specified with their details (e.g., name, email) when creating the document.
- The `create-document` endpoint accepts parameters such as `en_message` for configuring the document message.
- FlexiSign supports over 25 document types including PDF, Word, Excel, Open Office, PNG, JPG, and HTML.
- Workflows can be customized to have documents signed in a specific order or enable simultaneous signing by multiple recipients.

### Document Tracking

FlexiSign's dashboard helps browse and track documents in various stages such as Waiting for Others, Needs your Action, Completed, Declined, and Voided.

- Track the status of documents with real-time notifications when documents are viewed, signed, or declined.

### Multi-Language Support

Sign documents in your local language with the FlexiSign platform. Currently, 18 languages are supported.

### Branding

Users can personalize business workflows with their brand name and logo.

## Events

Based on available research, no triggers were found for FlexiSign on integration platforms, and webhook support has been requested by users but has not been confirmed as available. The FlexiSign API currently does not appear to support webhooks or event subscriptions. The provider does not support events.
