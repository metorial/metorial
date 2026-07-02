# Slates Specification for Netsuite

## Overview

NetSuite is Oracle's cloud-based ERP (Enterprise Resource Planning) platform that provides integrated business management including accounting, CRM, e-commerce, inventory, and order management. It is the leading integrated cloud business software suite, including business accounting, ERP, CRM and ecommerce software. It exposes its data and functionality through REST and SOAP APIs, along with SuiteQL for SQL-based data querying and SuiteScript for server-side customization.

## Authentication

NetSuite supports two primary authentication methods for API access:

### 1. Token-Based Authentication (TBA) — OAuth 1.0

TBA is based on OAuth 1.0. Ultimately, you need to generate a request header that includes a signature created using tokens retrieved from the NetSuite dashboard and the OAuth 1.0 standard.

**Required credentials:**

- **Account ID** (also called "realm"): Your NetSuite account identifier, found in the URL (e.g., `https://<ACCOUNT_ID>.app.netsuite.com`). The realm is the NetSuite account ID. If using a sandbox account, the ID includes a hyphen (e.g., `9876543-sb1`), which must be transformed by replacing hyphens with underscores and capitalizing letters (e.g., `9876543_SB1`).
- **Consumer Key** and **Consumer Secret**: Generated when creating an Integration Record in NetSuite (Setup > Integration > Manage Integrations).
- **Token ID** and **Token Secret**: Generated when creating an Access Token in NetSuite.

These credential values are only visible at the time of creation and will not be shown again in the NetSuite UI.

Each API request must include an OAuth 1.0 Authorization header with a computed HMAC-SHA256 signature. Unlike OAuth 2.0, the TBA tokens never expire, which makes them suitable for long-running integrations.

**Base URL format:** `https://<account_id>.suitetalk.api.netsuite.com/services/rest/`

**Setup steps:**

1. Enable Token-Based Authentication under Setup > Company > Enable Features > SuiteCloud.
2. Create an Integration Record (Setup > Integration > Manage Integrations > New) with the TOKEN-BASED AUTHENTICATION option checked.
3. Create an Access Token for a user and role.

### 2. OAuth 2.0

NetSuite's implementation of OAuth 2.0 supports the industry-standard authorization code grant flow for interactive user delegation and the client credentials flow for machine-to-machine integration.

#### Authorization Code Grant Flow

To use REST web services with OAuth 2.0, you must create an application using an integration record that provides the Client ID and Client Secret.

- **Authorization endpoint:** `https://<ACCOUNT_ID>.app.netsuite.com/app/login/oauth2/authorize.nl`
- **Token endpoint:** `https://<ACCOUNT_ID>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`
- **Scopes:** `rest_webservices`, `restlets` (configured as checkboxes on the integration record)
- **Redirect URI:** Configured on the integration record.
- The refresh token expires in 7 days; after that the application must go through the authorization code grant flow again to obtain new tokens.

#### Client Credentials (Machine-to-Machine) Flow

The client credentials flow is a machine-to-machine authentication method and does not require user manual interaction. This flow uses a JWT assertion signed with a certificate. You must generate a key pair, upload the public certificate to NetSuite, and use the private key to sign JWT tokens with the `rest_webservices` scope.

**Setup steps (for either OAuth 2.0 flow):**

1. Enable OAuth 2.0 and REST Web Services under Setup > Company > Enable Features > SuiteCloud.
2. Create an Integration Record with the appropriate OAuth 2.0 grant type enabled.
3. Note the Client ID and Client Secret (shown only once on save).

OAuth 2.0 is only available for REST web services and RESTlets. SOAP web services don't support OAuth 2.0.

## Features

### Record Management (CRUD)

The REST API supports full CRUD operations on records. You can create, read, update, upsert, and delete NetSuite records such as customers, vendors, sales orders, invoices, purchase orders, inventory items, journal entries, employees, and more. Records can also be transformed from one type to another (e.g., converting a sales order to an invoice). Record actions can be executed (e.g., approving a transaction).

- Records follow a HATEOAS model, meaning related sub-resources (e.g., line items on an order) may require additional requests to retrieve.
- The REST API typically processes one record per request for create or update.
- Custom record types and custom fields are accessible.

### SuiteQL Querying

SuiteQL is a query language based on the SQL-92 revision of the SQL database query language. It offers advanced query capabilities you can use to access your NetSuite records and data.

- You write SELECT statements with JOINs, WHERE clauses, GROUP BY, HAVING, ORDER BY — the standard SQL constructs.
- Queries are executed by sending a POST request to the suiteql resource, specifying the query in the request body.
- Endpoint: `POST /services/rest/query/v1/suiteql`
- Unlike standard REST API endpoints, which are sometimes limited in their filtering capabilities, SuiteQL provides greater flexibility and control over the data you extract.
- SuiteQL queries can return a maximum of 100,000 results.

### Record Filtering and Search

The REST API supports record collection filtering to retrieve lists of records matching certain criteria. You can filter record collections using query parameters on the collection endpoints without writing SuiteQL.

### RESTlets (Custom API Endpoints)

RESTlets allow you to deploy custom SuiteScript code as REST endpoints within NetSuite. SuiteScript is a scripting language based on JavaScript, that allows NetSuite developers to create customized scripts and functions. RESTlets can implement custom business logic, return data in any format, and handle any HTTP method (GET, POST, PUT, DELETE).

- RESTlets are useful when the standard REST API doesn't expose a particular record or functionality.
- They require SuiteScript development and deployment within NetSuite.

### Financial Management

Through the API, you can manage the full financial lifecycle: general ledger journal entries, accounts payable/receivable, invoices, bills, payments, credit memos, budgets, and financial reporting data via SuiteQL.

### Order and Inventory Management

The API supports managing sales orders, purchase orders, item fulfillments, item receipts, inventory adjustments, transfer orders, and return authorizations. Inventory levels and item availability can be queried.

### Customer and Vendor Management

Create and manage customer, contact, vendor, partner, and employee records, including associated addresses, communication preferences, and custom fields.

### Asynchronous Processing

The REST API supports asynchronous request processing. You can request that operations be processed asynchronously by including a `Prefer: respond-async` header, which is useful for long-running operations.

### File and Document Management

NetSuite's File Cabinet is accessible via the API, allowing you to upload, download, and manage files and documents attached to records.

## Events

NetSuite lacks built-in webhook endpoints. It does not provide native webhooks, but you can build webhook functionality using SuiteScript User Event Scripts and Workflow Action Scripts.

There is no first-class, configuration-only webhook or event subscription system. Instead, outbound event notifications require custom SuiteScript development:

### SuiteScript User Event Scripts

User Event Scripts trigger on create, edit, or delete actions on records. A script can be attached to any record type and will fire when that record is created, updated, or deleted. The script can then make outbound HTTP calls to external systems.

- Can be configured for specific record types (e.g., sales orders, customers, invoices).
- Triggers: beforeLoad, beforeSubmit, afterSubmit.
- Only fires for changes made through the UI or API (may not cover CSV imports or other bulk operations).

### Workflow Action Scripts

Unlike User Event Scripts, Workflow Action Scripts run as part of a NetSuite Workflow, which makes them more flexible and reliable. They trigger regardless of how a record is modified (UI, API, CSV import).

- Configured visually through NetSuite's Workflow Manager.
- Can be set to fire on specific state transitions or conditions (e.g., when an order status changes to "Approved").
- Workflows provide visual control over webhook conditions.

Both approaches require SuiteScript development (JavaScript), deployment within the NetSuite account, and administrative access. They are not self-service event subscriptions but rather custom-built outbound notification mechanisms.
