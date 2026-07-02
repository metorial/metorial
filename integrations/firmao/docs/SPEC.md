Now let me fetch the full API documentation PDF for more details:Now I have all the information I need. Based on the API documentation and search results, Firmao does not appear to support webhooks or event subscriptions natively. The API is a standard REST API for CRUD operations. Let me compile the specification.

# Slates Specification for Firmao

## Overview

Firmao is a cloud-based CRM and ERP platform designed for small and medium-sized businesses. It provides modules for customer relationship management, project and task management, invoicing, warehouse management, offers/orders, and employee time tracking. The system is developed by a Polish company founded in 2010.

## Authentication

Firmao uses **HTTP Basic Authentication** for all API requests.

**Setup steps:**

1. Navigate to **Company → Settings → API settings** panel in your Firmao account.
2. Enable the API.
3. Download the API login and generate an API password.

**Authentication method:**

- All requests must include an `Authorization` header with the value `Basic ` followed by a Base64-encoded string of `username:password`.
- Example: `Authorization: Basic ai5zbWl0aEBzdGVsbGlzLmJpczoxMjM0NTY=` (which is the Base64 encoding of `j.smith@stellis.bis:123456`).

**Required credentials:**

- **API Login**: Provided in the API settings panel.
- **API Password**: Generated in the API settings panel.
- **Organization ID**: Your organization identifier, visible in the URL after logging in (e.g., `https://system.firmao.net/{OrganizationID}/svc/v1/...`).

The base URL for all API requests is:
`https://system.firmao.net/{OrganizationID}/svc/v1/{resource}`

## Features

### Customer (Counterparty) Management

Create, read, update, and delete customer/company records. Customers include fields such as name, email addresses, phone numbers, addresses (office and correspondence), NIP/tax numbers, bank account details, customer type (e.g., PARTNER), industry, ownership type, and customer groups. Supports custom fields. Duplicate detection is enforced on unique fields like NIP number.

### Contact Person Management

Manage contact persons associated with customers. Each contact includes first name, last name, position, department, emails, phone numbers, and is linked to a customer record. A customer ID is required when creating a contact.

### Project Management

Create, read, update, and delete projects. Projects include team members, managers, tags, start/end dates, budgets, descriptions, and planned/actual cost and income tracking. Projects serve as containers for tasks.

### Task Management

Create, read, update, and delete tasks within or outside of projects. Tasks include fields such as priority, status (e.g., WAITING), responsible users, estimated hours, planned start/end dates, descriptions, and subtask support. Task types include PROJECT tasks and others.

### Invoicing and Transactions

Create and manage financial transactions including invoices, pro forma invoices, receipts, correction invoices, advance invoices, and bills. Transactions include line items with products, quantities, pricing (net/gross/VAT), payment details, currency, and customer linkage. Supports both sales and purchase modes. Automatic numbering is available. Credit memos/correction invoices require before/after entry pairs.

### Offers, Orders, and Contracts

Create and manage commercial documents: offers, orders, and agreements (contracts). Each document includes line items, pricing, customer details, statuses (NEW, SENT, DURING_NEGOTIATIONS, ACCEPTED, REJECTED, EXECUTED), payment terms, and validity dates. Supports both sales and purchase modes.

### Product and Service Management

Create, read, update, and delete products and services. Products include product codes, purchase and sale pricing (net/gross/VAT), stock state, units, classification numbers, and tags. Stock levels can be directly modified if the organization setting is enabled.

### Warehouse and Stock Management

Manage warehouse documents (GRN/Goods Received Notes, GIN/Goods Issue Notes, internal transfers). Documents track stock movements, pricing, customer/supplier associations, and warehouse assignments. Stock levels are automatically or manually updated based on document type.

### Sales Opportunities

Create and manage sales pipeline opportunities. Opportunities include customer linkage, responsible users, acquisition method, selling process, sales stage, value, currency, status (OPEN/CLOSED), and associated tags.

### Sales Notes

Create and manage sales notes (e.g., notes, meetings, phone calls) associated with customers. Notes include description, type, date, and can be linked to customers, contacts, projects, tasks, or transactions.

### Work Time Tracking

Create, edit, and manage employee time entries. Time entries can be started (with only a start time), ended (with only an end time), or created with both start and end times. Each entry is linked to a user and can be associated with tasks.

### Email Management

Read and query emails stored in Firmao's mail system. Emails can be filtered by mailbox (INBOX, etc.), and include sender, recipients, subject, status, and associated customer/contact/project information.

### File and Document Management

Upload and download files/attachments to various objects (tasks, projects, products, services, customers, offers, orders, sales notes, opportunities). Also supports listing all documents/files in the system, and downloading PDF versions of invoices and offers/orders using configured templates.

### Invoice Numbering Series

Retrieve numbering series configurations and get the next available document number for each type (invoice, proforma, offer, order, agreement, warehouse document, etc.).

### Filtering and Sorting

All list endpoints support filtering with comparison operators (contains, eq, ne, gt, lt, ge, le, in, notin, etc.) and sorting by field name and direction. This enables flexible querying of data across all object types.

### Custom Fields

All major objects support custom fields (keyed as `customFields.custom5`, etc.) that accept string values. Custom field definitions are configured in the Firmao system settings.

## Events

The provider does not support webhooks or event subscriptions. There is no built-in mechanism for Firmao to push notifications to external systems when data changes occur.
