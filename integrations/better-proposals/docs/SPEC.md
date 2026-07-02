Let me fetch the official API documentation page for more details.# Slates Specification for Better Proposals

## Overview

Better Proposals is a web-based platform for creating, sending, and tracking professional business proposals, contracts, and other sales documents. It supports digital signatures, payment collection (via Stripe, PayPal, GoCardless), proposal analytics, and CRM integrations. The API is available on Premium and Enterprise plans only.

## Authentication

Better Proposals uses API key (token) authentication via a custom request header. To obtain your API key, log in to your Better Proposals account and navigate to the API key generator (Integrations > API). Click "Generate API Key" to create your token. You can also regenerate your existing key at any time.

Include the token in the `Bptoken` header on every request:

```
Bptoken: YOUR_API_TOKEN
```

The base URL for all API requests is `https://api.betterproposals.io/`.

No OAuth or other authentication methods are supported. The API is only available on Premium or Enterprise plans.

## Features

### Proposal Management

Create and retrieve proposals. Proposals can be listed by status: new, opened, sent, signed, or paid. When creating a proposal, you can specify the company, cover design, template, document type, brand, currency, tax settings, contacts (with signature requirements), and merge tags for dynamic content personalization. You can also retrieve details for a specific proposal and get total proposal counts.

### Proposal Covers

Create custom cover designs for proposals. Covers are assigned to proposals during creation.

### Templates

Retrieve a list of all available templates and get detailed information about a specific template. Templates are used as the basis for new proposals.

### Document Types

List all document types and create new ones. Document types allow categorization of documents (e.g., Proposal, Contract, etc.) with a custom name and color. The default document type is "Proposal."

### Quotes

Retrieve all quotes or individual quote details, and create new quotes.

### Company Management

List, retrieve, and create companies. Companies represent client organizations and are associated with proposals.

### Currencies

Retrieve the list of supported currencies and details for a specific currency.

### Account Settings

Retrieve account settings, brand settings, and custom merge tags. Merge tags are used for dynamic personalization in proposals.

## Events

The official API documentation does not mention native webhooks. While native webhooks are not explicitly documented, the Zapier integration provides similar event-based functionality.

The provider does not support native webhooks or purpose-built polling mechanisms through its API. Event-driven automation is available only through third-party platforms like Zapier, which offer the following triggers:

- **New Proposal** — Triggers when a new proposal is created.
- **Proposal Sent** — Triggers when a proposal is sent.
- **Proposal Opened** — Triggers when a proposal is opened.
- **Proposal Signed** — Triggers when a proposal is signed.
- **Proposal Paid** — Triggers when a proposal is paid.

These triggers are provided via Zapier's polling mechanism, not native webhooks from Better Proposals.
