# Slates Specification for Erpnext

## Overview

ERPNext is an open-source enterprise resource planning (ERP) software built on the Frappe Framework. It provides a comprehensive suite of integrated applications to manage various business processes, including accounting, inventory management, human resources, and project management within a unified platform. Its API uses RESTful principles, where every business object (like Customer, Item, or Invoice) is treated as a resource accessible via standard HTTP methods.

## Authentication

ERPNext supports three authentication methods. A site URL (e.g., `https://yoursite.erpnext.com` or a self-hosted domain) is required for all methods.

### 1. Token-Based Authentication (API Key + API Secret)

Generate an API Key and API Secret from your ERPNext user account in Settings > My Settings > API Access. Pass them as a combined token in the `Authorization` header using the format: `Authorization: token api_key:api_secret`. If you are an ERPNext System Manager, you can also generate API keys and secrets for other users. The API calls are logged against and permissioned by the user who generated the keys.

### 2. Password-Based Authentication (Session/Cookie)

POST credentials (`usr` and `pwd`) to `/api/method/login`. A successful response returns a session cookie (`sid`) that must be sent with subsequent requests. The session expires in three days.

### 3. OAuth 2.0

ERPNext supports OAuth 2.0 with the Authorization Code grant flow. The relevant endpoints are:

- **Authorization**: `/api/method/frappe.integrations.oauth2.authorize` — requires `client_id`, `redirect_uri`, `response_type=code`, `scope`, and an optional `state` parameter.
- **Token Exchange**: `/api/method/frappe.integrations.oauth2.get_token` — exchange the authorization code for an access token using `grant_type=authorization_code`.
- **Revoke Token**: `/api/method/frappe.integrations.oauth2.revoke_token` — revoke an access token.

Access tokens expire in 3600 seconds, and a refresh token is provided alongside the access token. Use the `Authorization: Bearer <access_token>` header for authenticated requests. An OAuth Client must be configured in ERPNext before using this method, requiring a `client_id` and `redirect_uri`.

### Custom Inputs

- For cloud-hosted instances, you need to provide your ERPNext subdomain and choose between `erpnext.com` and `frappe.cloud` as the domain. For self-hosted instances, provide the fully qualified domain.

## Features

### Document Management (CRUD on DocTypes)

ERPNext's core data model is based on "DocTypes" — each business entity (Customer, Sales Order, Invoice, Employee, Item, etc.) is a DocType. The API lets you create, read, update, or delete any ERPNext document — from Sales Orders to Invoices to Employees. You can list documents with filtering (including AND/OR filters), field selection, sorting, and pagination. Partial updates are supported (only send fields you want to change).

### Accounting & Finance

Manage financial documents such as Sales Invoices, Purchase Invoices, Payment Entries, Journal Entries, and General Ledger entries. Track accounts receivable/payable and manage chart of accounts.

### Inventory & Stock Management

Create and manage Items, Warehouses, Stock Entries, Material Requests, Delivery Notes, and Purchase Receipts. Track stock levels, item pricing, and inventory movements.

### Sales & CRM

Manage the full sales pipeline including Leads, Opportunities, Quotations, Sales Orders, and Customers. Track customer interactions and sales transactions.

### Purchasing

Handle Suppliers, Purchase Orders, Requests for Quotation, and Supplier Quotations. Manage the procurement lifecycle from request to receipt.

### Human Resources

Manage Employees, Attendance, Leave Applications, Payroll, and Expense Claims. Access HR records and process HR-related transactions.

### Manufacturing

Work with Bills of Materials (BOM), Work Orders, and Production Plans. Track manufacturing operations and resource allocation.

### Project Management

Create and manage Projects, Tasks, and Timesheets. Track project progress and resource utilization.

### Remote Method Calls

ERPNext's API is built on the Frappe Framework, which allows calling arbitrary whitelisted server-side Python methods via `/api/method/<dotted.path>`. This enables access to custom business logic, report generation, and specialized operations beyond standard CRUD.

### File Uploads

Upload files to ERPNext via a dedicated endpoint (`/api/method/upload_file`), supporting binary file data attached to documents.

### Reporting & Data Extraction

The API can be used to extract data for advanced analytics and reporting. Businesses can connect ERPNext to BI tools, data warehouses, and custom dashboards.

## Events

ERPNext supports outbound webhooks that can be configured for any DocType.

### Document Events

For a select DocType, you can create a webhook that triggers on specific document events under certain conditions, if required. The supported document events include:

- **after_insert** — triggered when a new document is created.
- **on_update** — triggered when a document is saved/updated.
- **on_submit** — triggered when a document is submitted.
- **on_cancel** — triggered when a document is cancelled.
- **on_trash** — triggered when a document is deleted.
- **on_update_after_submit** — triggered when a submitted document is amended.
- **on_change** — triggered when a document value changes.

Configuration options:

- **DocType**: Select which DocType to watch (e.g., Sales Order, Invoice, Customer).
- **Condition**: Optionally define conditions (using Frappe's expression syntax) to only trigger the webhook for specific scenarios.
- **Request URL**: The destination URL that receives the webhook payload.
- **Request Method**: HTTP method to use (POST by default).
- **Request Structure**: Choose between Form URL-Encoded or JSON body formats. JSON bodies support Jinja templating to customize the payload.
- **Webhook Headers**: Add custom HTTP headers (e.g., for authentication with the receiving service).
- To optionally add security, you can set up a "Webhook Secret" which adds an `X-Frappe-Webhook-Signature` header containing a base64-encoded HMAC-SHA256 hash of the payload.
