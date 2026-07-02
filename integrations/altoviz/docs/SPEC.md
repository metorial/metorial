Now let me fetch the API reference to understand the full feature set:Now I have enough information to write the specification.

# Slates Specification for Altoviz

## Overview

Altoviz is a cloud-based invoicing and accounting platform for small businesses and freelancers. The platform provides free RESTful APIs to deal with quotes, invoices, contacts, customers and products. It also supports suppliers, receipts, and metadata on entities.

## Authentication

Altoviz uses API key-based authentication. API keys can be obtained from your Altoviz account settings.

There are three ways to pass the API key:

1. **Header (recommended):** Include the API key in the `X-API-KEY` request header.
   - Example: `curl -iH "x-api-key:YOUR_API_KEY" https://api.altoviz.com/v1/settings`

2. **HTTP Basic Authentication:** Basic authentication is also supported using `apikey` as the username and the API key as the password.
   - Example: `curl -u "apikey:YOUR_API_KEY" https://api.altoviz.com/hello`

3. **URL Parameter (discouraged):** You can send the API key using a query parameter named `apikey`, though this method is discouraged as the API key appears in logs, web analytics services, or caches.
   - Example: `https://api.altoviz.com/hello?apikey=YOUR_API_KEY`

The API base URL is `https://api.altoviz.com/v1`. You can verify your API key by calling the `/hello` endpoint.

## Features

### Customers & Contacts Management

Create, list, update, and delete customers and contacts. Entities support "internal ids" so you can map your own application IDs to Altoviz entities rather than storing Altoviz IDs. Customer families can also be managed and retrieved by internal ID. Customers can be searched by email.

### Sales Invoices

Create, update, delete, list, finalize, and download sales invoices. Invoices can be updated and deleted as long as they are still in draft mode. Invoices can be marked as paid by setting the date and payment method. Invoices can be sent by email directly through the API. Results can be sorted and filtered by dates, customer, or status, and can include canceled invoices.

### Sales Quotes

Create, list, update, and delete sales quotes. Quotes can be sent by email through the API.

### Sales Credits

Just like sales invoices, you can list, add, edit and remove sales credits.

### Purchase Invoices

Purchase invoices can be created by sending a PDF file to the API. Purchase invoices can also be downloaded.

### Products

Create, list, update, and delete products. Products can be searched by product number. Product images can be added, updated, and retrieved.

### Suppliers & Receipts

You can list, add, edit and delete receipts and suppliers.

### Metadata

Metadata allows you to store important information for your app on Altoviz entities. Metadata can also be passed to the mark-as-paid API, where it will be stored on the payment.

### Settings & Reference Data

Retrieve account settings including timezone, logo, VAT number, and VAT mode. List available VAT rates and classifications (accounting registers). List all available units.

### User Information

Retrieve information about the currently authenticated user via `/v1/Users/me`.

## Events

Altoviz supports webhooks that notify your application when specific data changes occur. Webhooks are registered via the API by providing a public URL and selecting the event types to listen for. You can optionally set a secret key during registration, which will be included in every call for verification. Altoviz generates signatures using HMAC with SHA-256 for integrity verification.

### Contact Events

- `ContactCreated` — Fired after a contact is created.
- `ContactUpdated` — Fired after a contact is updated.
- `ContactDeleted` — Fired after a contact is deleted.

### Customer Events

- `CustomerCreated` — Fired after a customer is created.
- `CustomerUpdated` — Fired after a customer is updated.
- `CustomerDeleted` — Fired after a customer is deleted.

### Invoice Events

- `InvoiceCreated` — Fired after a sales invoice is created.
- `InvoiceUpdated` — Fired after a sales invoice is updated.
- `InvoiceDeleted` — Fired after a sales invoice is deleted.

### Quote Events

- `QuoteCreated` — Fired after a quote is created.
- `QuoteUpdated` — Fired after a quote is updated.
- `QuoteDeleted` — Fired after a quote is deleted.

### Product Events

- `ProductCreated` — Fired after a product is created.
- `ProductUpdated` — Fired after a product is updated.
- `ProductDeleted` — Fired after a product is deleted.

When registering a webhook, you specify a name, a list of event types to subscribe to, and the target URL. Multiple event types can be combined in a single webhook registration.
