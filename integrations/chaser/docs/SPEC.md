The search for Chaser webhooks returned results for unrelated services (Chaster, Chargebee, etc.), not for ChaserHQ. Let me check the API docs more carefully for webhook support.# Slates Specification for Chaser

## Overview

Chaser (chaserhq.com) is an accounts receivable automation platform that helps businesses chase late payments, manage credit control, and improve cash flow. It integrates with accounting systems, ERPs, and CRMs to automate payment reminders and track invoice statuses. The API allows importing and exporting customer, invoice, credit note, and overpayment data into Chaser from external systems.

## Authentication

Chaser uses API keys for authentication. Specifically, the API uses **HTTP Basic Authentication**.

To obtain credentials:

1. Log in to Chaser, create a new organization, select API from the list of available accounting systems, click Connect with API, enter your organization name, and then go to Organization Settings > Integrations and create a new API key/secret.

To authenticate API requests, provide an `Authorization` header with the word `Basic` followed by the Base64-encoded string of `API_KEY:API_SECRET`:

```
Authorization: Basic base64(API_KEY:API_SECRET)
```

The API key serves as the username and the API secret serves as the password. The base URL for all API requests is `https://openapi.chaserhq.com/`.

## Features

### Customer Management

Create, retrieve, update, and manage customers in Chaser. Each customer requires an external ID (from your source system) and a company name. Customers can have contact details (name, email, phone, mobile number), addresses (billing, delivery, PO box), group/tag assignments, and a status of ACTIVE or ARCHIVED. The API allows you to interact with information relating to the organisations' customers. You can also request additional computed fields like payment portal links, payer ratings, and average days to pay.

### Contact Person Management

Manage multiple contact persons per customer. Each contact person has their own external ID, name, email, phone, and mobile number, and can be set to ACTIVE or ARCHIVED status. This allows different people at a customer organization to receive reminders.

### Invoice Management

The API allows you to interact with information relating to the organisations' invoices. Create, retrieve, and update invoices with details including invoice number, status (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, DELETED), currency, amounts (due, paid, total, subtotal), dates (issued, due, fully paid), and customer association. A valid customer ID is required to create an invoice, therefore the customer must be created before adding the invoice. You can also upload invoice PDFs to attach them to invoices. Invoices support filtering by many fields including status, amounts, and dates.

### Credit Note Management

The API allows you to interact with information relating to the organisations' credit notes. Create, retrieve, and update credit notes with fields for credit note number, remaining credit, total, date, status, and currency. Chaser's monthly statements will include any credit notes if they are ACTIVE and have remaining credit, and will calculate the overall customer balance by subtracting unallocated credits from invoice amounts.

### Overpayment Management

Create, retrieve, and update overpayment records. Overpayments track excess payments made by customers, with fields for remaining credit, total, date, status, and currency. Like credit notes, they are associated with customers via external ID.

### Organisation Information

Retrieve details about the connected organisation(s) including name, legal name, base currency, country code, timezone, and last sync date.

### Organisation Sync

Trigger a manual synchronisation of the organisation data. You can optionally specify post-sync tasks to execute, such as calculating next chases, updating invoice instalments, calculating contact balances, verifying contact credit limits, calculating task reminders, and calculating total revenue.

## Events

The provider does not support events. The Chaser API does not offer webhooks or any built-in event subscription mechanism. Data synchronization is achieved by pushing data into Chaser via the API and triggering syncs manually via the sync endpoint.
