Now let me check the actual API documentation to see available resources/endpoints:Now I have enough information to write the specification.

# Slates Specification for Elorus

## Overview

Elorus is a cloud-based invoicing, expense management, and time tracking platform designed for freelancers and small businesses. Elorus is an online software that helps businesses fulfill their invoicing, expense management and time tracking needs. It supports multi-currency invoicing, recurring billing, project management, client portals, and integrations with Greek tax compliance systems (myDATA/AADE).

## Authentication

Elorus uses **token-based authentication** with an API key.

Two credentials are required for every API request:

1. **API Key (Token):** To find your API key, open the Elorus web application and navigate to the "User Profile". The API key is personal and there's only one key per user.

2. **Organization ID:** X-Elorus-Organization: Organization ID. The organization whose data you wish to access. To find the Organization ID visit the Elorus web application and navigate to "Settings > Organization > Organization ID". Each organization has an ID of its own.

Both values must be sent as HTTP headers on every request:

```
Authorization: Token <your-api-key>
X-Elorus-Organization: <your-organization-id>
Content-Type: application/json
```

The base URL is `https://api.elorus.com/v1.2/`. There are no OAuth flows or scopes — authentication is purely via the static API key and organization ID pair.

## Features

### Contact Management

Create and manage contacts representing clients, suppliers, or both. Since Elorus will let you manage your sales as well as your expenses, a contact may represent either a client or a supplier (or even both). Contacts can include company details, VAT numbers, addresses, and custom fields. Contacts can be searched and filtered by various attributes.

### Invoicing

Create, manage, and send invoices, credit notes, estimates/pro-forma invoices, and self-billed invoices. Using Elorus you may issue professional Invoices and Credit notes. If your business model involves managing subscriptions, you may schedule recurring sales to generate invoices automatically. You can create Estimates or Pro-forma invoices which in turn can be invoiced. Invoices support multiple currencies, configurable tax rates, document types, numbering sequences, and line items with products/services. Invoices can be exported to PDF and sent via email through the API. You can now perform this task starting from a credit note. This new endpoint enables you to associate the credit of a credit note to pay off one or more invoices of the same client.

### Delivery Notes

Developers can integrate delivery document management into their own systems and workflows. The API allows you to create and manage dispatch, return, and internal transfer documents. Retrieve details of existing delivery notes for reporting or integration purposes.

### Payment Management

Record payments received against invoices and track payment status (unpaid, partially paid, paid). Export payment receipts as PDFs. Associate credit notes with invoices to settle outstanding balances.

### Expense Tracking

Track and manage expenses to keep your business within budget. Elorus enables users to easily record and categorize expenses, link them to specific projects, and tag them as billable to include them in invoices.

### Time Tracking & Projects

Manage projects, time entries, and tasks directly through the API. With the help of Elorus you may monitor the finances of your projects, as well as record and invoice the time you spend working on project tasks. Projects support tracking categories for custom classification and reporting.

### Products & Services (Inventory Items)

Register and manage products and services that can be referenced on invoice line items. Supports custom units of measurement and multi-currency pricing.

### Document Types & Taxes

Manage document types (invoice, credit note, estimate, etc.) and tax configurations. Set custom tax amounts on documents. Apply global taxes directly to documents without manually assigning them to each line.

### Private Notes & Client Discussions

Create and manage internal notes for contacts, invoices, payments, and more—visible only to your team. Engage with clients by managing comments through the API, in sync with the client portal.

### Attachments

You can now upload, retrieve, and delete attachments via the API. Attachments can be associated with invoices, contacts, expenses, and other records.

### Tracking Categories

Organize records (sales, expenses, payments, inventory items, contacts, and projects) using custom tracking categories for segmented reporting and analysis.

### Greek Tax Compliance (myDATA)

Assign multiple myDATA classifications to each invoice line. The API supports integration with the Greek electronic invoicing infrastructure (myDATA/AADE) and e-invoicing providers. This feature is specific to businesses operating in Greece.

### POS Payment Integration

The Viva POS integration is available through the Elorus Developer API. This addition allows developers to integrate POS payment functionality into their applications. Supports preloading transactions for deferred execution and POS refunds for credit notes.

## Events

The provider does not support webhooks or event subscriptions through its API. Elorus has an internal "Events" feature for auditing record activity within the application, but there is no webhook or push-based notification mechanism available for external integrations.
