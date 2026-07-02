# Slates Specification for Odoo

## Overview

Odoo is an open-source ERP (Enterprise Resource Planning) platform offering a modular suite of business applications including CRM, Sales, Accounting, Inventory, HR, Manufacturing, eCommerce, Project Management, and more. It offers a complete suite of applications for CRM, accounting, inventory, HR, eCommerce, and more, with a modular design that allows businesses of all sizes to streamline operations from a single platform. All installed modules expose their data models through a unified external API, enabling full CRUD operations on any record in the system.

## Authentication

Odoo supports multiple authentication methods, all requiring the **Odoo instance URL** (server hostname) and **database name** as connection parameters.

### 1. API Key Authentication (Recommended, v14+)

From version 14 onwards, Odoo introduced API key authentication. A user can generate an API key from their profile settings and use it in place of the password when making XML-RPC or JSON-RPC calls. The way to use API Keys is to simply replace the password by the key. The login remains in-use.

To generate an API key: Go to your Preferences (or My Profile), open the Account Security tab, and click New API Key. Input a description for the key, click Generate Key, then copy the key provided. Store this key carefully: it is equivalent to your password, and the system will not be able to retrieve or show the key again later on.

**Required credentials:**

- Odoo instance URL (e.g., `https://mycompany.odoo.com`)
- Database name
- Username (login email)
- API Key (used in place of password)

**For JSON-2 API (v19+):** The login/password authentication scheme is replaced by an API key via the `Authorization: bearer` HTTP header. The database must only be provided (via the `X-Odoo-Database` HTTP header) on systems where there are multiple databases available for the same domain.

### 2. Username/Password Authentication (XML-RPC)

XML-RPC is the traditional API method in Odoo, and it works in all versions. To log in, you provide the database name, a username (usually the login email), and a password. These credentials are sent to the `/xmlrpc/2/common` endpoint. If the login is successful, Odoo returns a user ID (uid). This uid is then used in requests sent to the `/xmlrpc/2/object` endpoint.

**Required credentials:**

- Odoo instance URL
- Database name
- Username
- Password

### 3. Session-Based Authentication (JSON-RPC)

Authentication happens through the `/web/session/authenticate` endpoint. When you send the database name, username, and password, Odoo creates a session if the login is successful. This session acts like a cookie and can be reused for future API calls.

### Important Notes

- Access to data via the external API is only available on Custom Odoo pricing plans. Access to the external API is not available on One App Free or Standard plans.
- For Odoo Online instances (`<domain>.odoo.com`), users are created without a local password, so API keys are required for external API access on hosted instances.
- API access is governed by the authenticated user's access rights and record rules—there are no separate API scopes.

## Features

### Record Management (CRUD Operations)

The API provides full create, read, update, and delete operations on any Odoo model the authenticated user has access to. This includes all installed module data such as contacts, leads, sales orders, invoices, products, inventory movements, employees, projects, tasks, and more. Odoo is built from modules. Each module adds a set of features (like Sales, HR, or Inventory). Modules also expose their models and fields through the API.

- Records can be searched using domain filters (a list of condition tuples).
- Specific fields can be selected to limit returned data.
- Records can be created, updated, and deleted individually or in bulk.

### Model Introspection

The API provides information about Odoo models via its various fields: query the system for installed models, and get information about a specific model (generally by listing the fields associated with it). This is useful for dynamically discovering available data structures.

- In Odoo 19+, a `/doc` endpoint dynamically generates documentation on the models, fields, and methods available for a specific database.

### CRM and Sales

Manage leads, opportunities, and the full sales pipeline. Create and update quotations, confirm sales orders, and manage customer contacts. Sales orders can be linked to invoicing and inventory workflows.

### Accounting and Invoicing

Create and manage invoices, vendor bills, journal entries, payments, and tax records. Access financial reports data such as aged receivables/payables.

### Inventory and Warehouse

Manage products, stock levels, stock moves, warehouse transfers, and delivery orders. Track serial numbers and lots. Supports multi-warehouse operations.

### Purchase Management

Create and manage purchase orders, track vendor relationships, and automate procurement workflows.

### Human Resources

Manage employee records, contracts, attendance, time off, recruitment, and timesheets. Can be integrated with payroll.

### Project Management

Create and manage projects, tasks, and timesheets. Track progress and assign resources.

### eCommerce and Website

Manage products, orders, and customers from online stores built with Odoo's website/eCommerce modules.

### Dynamic Model Creation

You can create new models dynamically over RPC. Custom model names must start with `x_`. It is not possible to add new methods to a custom model, only fields.

### Method Execution

Beyond standard CRUD, the API allows calling any public method on a model, enabling access to business logic such as confirming orders, validating invoices, or triggering workflows.

## Events

Odoo does not have a built-in, native webhook system for subscribing to outgoing events as part of its core external API. However, there are two mechanisms worth noting:

### Incoming Webhooks (via Automation Rules / Odoo Studio)

Webhooks created in Odoo Studio allow you to automate an action in your Odoo database when a specific event occurs in another, external system. When the event occurs in the external system, a payload is sent to the Odoo webhook's URL via a POST API request, and a predefined action is performed in the database. Unlike scheduled actions, webhooks enable real-time, event-driven communication and automation.

- Available from Odoo 17+ with Odoo Studio (Enterprise).
- These are **incoming** webhooks—Odoo receives events from external systems and acts on them.
- A unique URL is auto-generated per webhook and can be targeted at any model.
- Actions triggered can include: updating records, creating records, executing custom Python code, sending emails, or sending an outgoing webhook notification.

### Outgoing Webhook Notifications (via Automation Rules)

It is also possible to create an automated action that sends data to an external webhook when a change occurs in your Odoo database. The "Send Webhook Notification" action makes a POST call to another system (webhook).

- Using automation rules, Odoo can send outgoing HTTP POST requests to external URLs when specific events occur (record creation, field updates, stage changes, time conditions, etc.).
- Triggers include: field value changes, record creation/update, stage transitions, email events, and time-based conditions.
- The payload can include selected fields from the triggering record.
- Requires Odoo Studio (Enterprise) for no-code setup, or custom server action code.
- This is not a traditional webhook subscription API—there is no API endpoint to programmatically register/manage webhook subscriptions. Configuration is done through the Odoo UI or server action definitions.
