Let me fetch the actual API documentation from the Postman link referenced in the Pipedream integration.Now let me check the Documint Postman API docs and e-signature features.Now I have enough information to write the specification. Let me also check the Documint "Minted Documents" feature mentioned in the docs.

# Slates Specification for Documint

## Overview

Documint is a document generation platform that dynamically merges data into pre-designed templates to produce customized PDFs such as invoices, proposals, contracts, certificates, and reports. It lets you generate customized PDFs using data from various tools, dynamically merging data into a pre-designed template and returning a completed PDF ready to send, store, or share. It integrates natively with Airtable, HubSpot, Google Sheets, Salesforce, Stripe, and other platforms, and offers a REST API for custom integrations.

## Authentication

Documint uses API keys for authentication.

To authenticate API requests, set the header key to `api_key` and value should be a valid API Key. The API base URL is `https://api.documint.me/1/`.

**How to obtain an API key:**
You can create an API key by following the instructions in the Documint documentation. API keys are generated from within your Documint account settings.

**Example request:**

```
GET https://api.documint.me/1/templates
Headers:
  api_key: YOUR_API_KEY
```

There is no OAuth2 flow or other authentication method; the API relies solely on API key-based authentication via a custom header.

## Features

### Document Generation (Merging)

Create documents by merging data into pre-designed templates. You can insert custom data into predefined fields, generate documents on the fly, and streamline the creation of invoices, contracts, reports, and more. You provide a template ID and a set of variables (key-value pairs) that correspond to the dynamic tokens defined in your template.

- The output is a PDF file or a PDF link.
- Documint uses the term "merge" to refer to the process of merging your data with your template to create a document.
- Documint only stores the PDF link for 24 hours. Uploading to cloud storage is recommended.
- You can have unlimited variables in your template.
- The data used to create your documents is never stored so there's never any risk of it being exposed.

### Template Management

List and retrieve available templates from your Documint account. The API allows you to retrieve a list of your available Documint templates. Templates are designed in Documint's visual editor and contain dynamic tokens (placeholders) that get populated at generation time.

- Templates use dynamic tokens, which are placeholders that represent real data (like customer names, totals, or product images).
- Templates support conditional logic, repeating elements (e.g., table rows for line items), static and dynamic tables, text, and images.
- The template ID can be found at the end of the template URL after `templates/`.

### E-Signatures (Documint Sign)

Documint allows you to set up e-sign components in documents to send them directly to clients for signing.

- Signer information needs to be included with the data sent to Documint when creating a document.
- Supports multiple signers, signing order, required fields, expiration times, and reminders.
- This feature is available only on Silver plan and above and is currently in beta, available upon request.

## Events

The provider does not support events. Documint's REST API is designed for on-demand document generation and template listing. There is no webhook or event subscription mechanism provided by Documint's API. Event-driven workflows are typically achieved through third-party automation platforms like Zapier or Make, which trigger Documint actions based on external events.
