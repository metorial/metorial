Now let me get more details on the webhook configuration and Papersign webhooks:Now let me check the webhook trigger types and Papersign webhook events:Let me get the specific Papersign webhook trigger events:Now I have all the information needed to write the specification.

# Slates Specification for Paperform

## Overview

Paperform is an online form builder that supports surveys, quizzes, payment forms, scheduling forms, and order forms with conditional logic. It also includes Papersign, an integrated document signing product for collecting eSignatures. The platform provides a REST API for managing forms, submissions, products, coupons, and Papersign documents programmatically.

## Authentication

Paperform uses API Key authentication. You can generate an API key from your account page at https://paperform.co/account/developer. The API key must be sent with every request in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer <your_api_key>
```

The base URL for all API requests is `https://api.paperform.co/v1`.

The API is available on specific pricing plans. There are two tiers: Standard API (available on Pro, Business, and Enterprise plans) and Business API (available only on Business and Enterprise plans), which provides access to additional features like webhook management via the API.

## Features

### Form Management

Retrieve a list of all forms, get details for a specific form by slug or ID, and update form settings. Forms are identified by either their slug or unique ID.

### Form Fields

List and retrieve individual form fields for a given form. Fields can also be updated, allowing you to modify question configuration programmatically. Each field is identified by a unique field key.

### Submissions

Retrieve and manage form submissions. You can list all submissions for a form, get individual submission details, and delete submissions. Submissions can be accessed either through a form (by form slug/ID) or directly by submission ID.

### Partial Submissions

Paperform provides access to partial submissions — form responses that were started but not completed. You can list, retrieve, and delete partial submissions. Partial submission data is available for 30 days after each drop-off.

### Products

Manage products associated with payment/order forms. You can list, create, retrieve, update, and delete products on a form. Products are identified by SKU. You can also update a product's available quantity and sold count independently.

### Coupons

Create and manage discount coupons for forms. Supports listing, creating, retrieving, updating, and deleting coupons. Each coupon is identified by its code.

### Spaces

Spaces allow organizing forms into groups. You can list, create, retrieve, and update spaces, as well as list all forms within a specific space.

### Translations

Manage form translations for multilingual support. You can list, create, retrieve, update, and delete translations.

### Papersign Documents

Manage eSignature documents through the Papersign API. You can list and retrieve documents, send documents for signing, copy documents, cancel in-progress documents, and move documents between folders.

### Papersign Folders

List existing Papersign folders and create new ones for organizing documents.

### Papersign Spaces

List Papersign spaces to view how documents are organized at the top level.

## Events

Paperform supports webhooks for both form submissions and Papersign document events. Webhooks can be managed via the API (Business API tier required) or configured through the form editor UI.

### Form Submission Events

Webhooks can be triggered in response to a New Submission or a Partial Submission. Webhooks POST a JSON payload on submission to the saved webhook URL(s). The payload includes all question data, submission ID, creation timestamp, IP address, and payment information if applicable. Paperform webhooks support custom headers, which can be used for authentication and supplying additional information. Partial Submission webhooks are only triggered when a given partial response has not been updated within the last 30 minutes, and has not been submitted yet.

### Papersign Document Events

Webhooks can be configured to fire when signature requests are sent out, when a document's signatures are completed, or at any other point during the signing process. Each webhook is associated with a specific space or folder, rather than a single document. Available trigger events are:

- **Document sent** — A signature request has been sent out.
- **Document completed** — All parties have signed. This is the only event that includes a URL for the signed document in the payload.
- **Document cancelled** — The document owner cancelled the signature request.
- **Document rejected** — A signer rejected the document.
- **Document expired** — The document reached its expiry time before all parties signed.
- **Signer notified** — A signer was notified about the document.
- **Signer viewed** — A signer viewed the document.
- **Signer consent accepted** — A signer accepted the electronic consent disclosure.
- **Signer nominated** — A different signer was nominated.
- **Signer signed** — An individual signer completed their signature.

You can configure whether the webhook fires for documents in sub-folders ("all descendants") or only direct children of the current space or folder. Multiple trigger events can be selected for a single webhook.
