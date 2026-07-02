Let me get more details on the API navigation/full list of resources and the OAuth scopes, as well as confirm webhook details specific to Zoho Inventory.Now let me get the full OAuth scopes list from the OAuth page:Now I have all the information I need. Let me compile the specification.

# Slates Specification for Zoho Inventory

## Overview

Zoho Inventory is a cloud-based inventory management application that is part of the Zoho suite. It provides tools for tracking stock levels, managing orders (sales and purchase), invoicing, shipping, and warehouse management across multiple locations. The API allows programmatic access to all operations available in the web client.

## Authentication

Zoho Inventory uses **OAuth 2.0** as its sole authentication method.

### Setup

1. Register your application at [Zoho Developer Console](https://accounts.zoho.com/developerconsole) to obtain a **Client ID** and **Client Secret**.
2. Redirect users to the authorization URL to obtain a grant code:
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope={scopes}&client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&access_type=offline
   ```
3. Exchange the grant code for an access token and refresh token via POST to:
   ```
   https://accounts.zoho.com/oauth/v2/token?code={code}&client_id={client_id}&client_secret={client_secret}&redirect_uri={redirect_uri}&grant_type=authorization_code
   ```
4. Access tokens expire in approximately **one hour**. Use the refresh token (permanent) to obtain new access tokens:
   ```
   https://accounts.zoho.com/oauth/v2/token?refresh_token={refresh_token}&client_id={client_id}&client_secret={client_secret}&redirect_uri={redirect_uri}&grant_type=refresh_token
   ```

### Passing Tokens

The access token must be passed in the `Authorization` header as: `Zoho-oauthtoken {access_token}`

### Data Centers

Zoho Inventory is hosted across multiple data centers. The OAuth and API base URLs must match the user's data center domain:

| Region              | Accounts URL                     | API Base URL                             |
| ------------------- | -------------------------------- | ---------------------------------------- |
| US (.com)           | `https://accounts.zoho.com/`     | `https://www.zohoapis.com/inventory/`    |
| EU (.eu)            | `https://accounts.zoho.eu/`      | `https://www.zohoapis.eu/inventory/`     |
| India (.in)         | `https://accounts.zoho.in/`      | `https://www.zohoapis.in/inventory/`     |
| Australia (.com.au) | `https://accounts.zoho.com.au/`  | `https://www.zohoapis.com.au/inventory/` |
| Canada (.ca)        | `https://accounts.zohocloud.ca/` | `https://www.zohoapis.ca/inventory/`     |
| Japan (.jp)         | —                                | `https://www.zohoapis.jp/inventory/`     |
| China (.com.cn)     | —                                | `https://www.zohoapis.com.cn/inventory/` |
| Saudi Arabia (.sa)  | —                                | `https://www.zohoapis.sa/inventory/`     |

### Organization ID

Every API request requires an `organization_id` query parameter. This can be retrieved from the `GET /organizations` endpoint after authentication.

### Scopes

Scopes follow the pattern `ZohoInventory.{module}.{operation}` where operation is one of `CREATE`, `READ`, `UPDATE`, `DELETE`. A full-access scope is also available: `ZohoInventory.FullAccess.all`.

Available scope modules:

- `contacts` — Contacts and contact persons
- `items` — Items
- `compositeitems` — Composite/bundled items
- `inventoryadjustments` — Item adjustments
- `transferorders` — Transfer orders
- `salesorders` — Sales orders
- `packages` — Packages
- `shipmentorders` — Shipment orders
- `invoices` — Invoices
- `customerpayments` — Customer payments
- `salesreturns` — Sales returns
- `creditnotes` — Credit notes
- `purchaseorders` — Purchase orders
- `purchasereceives` — Purchase receives
- `bills` — Bills
- `settings` — Users, taxes, currencies, warehouses, and other settings

Multiple scopes can be comma-separated, e.g., `ZohoInventory.items.READ,ZohoInventory.salesorders.CREATE`.

## Features

### Item & Inventory Management

Create, update, and manage individual items and item groups (variants). Items can be of type goods or service, and support attributes like SKU, UPC, EAN, ISBN, sales/purchase prices, tax configuration, reorder levels, and custom fields. Composite items (bundles/assemblies) can also be managed, including creating assemblies and tracking assembly history. Items can be marked as active or inactive.

### Item Adjustments

Record inventory quantity or value adjustments with reason codes and reference numbers. Adjustments can be applied per location/warehouse and support multiple line items per adjustment.

### Multi-Warehouse / Location Management

Enable multi-warehouse functionality, create and manage warehouses/locations with addresses. Locations can be marked as active, inactive, or primary. Transfer orders allow moving stock between warehouses and marking transfers as received.

### Sales Order Management

Create, update, and track sales orders with line items, customer associations, shipment dates, and custom fields. Sales orders can be confirmed, voided, or bulk-confirmed. Supports drop shipment workflows.

### Packaging & Shipping

Create packages (packing slips) against sales orders to track what is being shipped. Create shipment orders with tracking numbers, delivery methods, shipping charges, and carrier information. Shipments can be marked as delivered.

### Invoicing

Create and manage invoices with full lifecycle support: mark as sent, void, draft, or write off. Invoices support payment terms, templates, attachments, comments, billing/shipping addresses, and email delivery. Credits can be applied to invoices, and payment reminders can be enabled or disabled.

### Retainer Invoices

Create and manage retainer (advance payment) invoices with approval workflows, email delivery, templates, attachments, and comments.

### Customer Payments

Record and manage payments received from customers, linked to invoices. Supports custom fields.

### Sales Returns & Credit Notes

Create sales returns against sales orders and record returned items. Credit notes can be created, approved, emailed, applied to invoices, or refunded. Supports approval workflows and full comment/history tracking.

### Purchase Order Management

Create and manage purchase orders with vendor associations, delivery dates, shipping methods, and line items. Purchase orders can be marked as issued or cancelled. Supports drop shipment and back-order scenarios.

### Purchase Receives & Bills

Record goods received against purchase orders. Create and manage vendor bills with status transitions (open, void). Bills support custom fields.

### Vendor Credits

Create vendor credits, apply them to bills, and process refunds. Supports approval workflows, comments, and history tracking.

### Contacts & Contact Persons

Manage customer and vendor contacts with addresses, email statements, and activity status. Each contact can have multiple contact persons with a designated primary person.

### Price Lists

Create and manage price books that define custom pricing for items. Price lists can be marked as active or inactive.

### Tax Configuration

Create and manage taxes, tax groups, tax authorities (US/CA editions), and tax exemptions (US edition).

### Currency Management

Create and manage currencies used across the organization.

### User Management

Create and manage organization users with roles (admin, staff, etc.). Users can be invited, activated, or deactivated.

### Tasks

Create and manage tasks with comments, attachments, and status tracking (open, ongoing, completed). Tasks support completion percentage tracking.

### Reporting Tags

Create reporting tags with options for categorizing transactions. Tags support visibility conditions, ordering, and active/inactive states.

### Organization Management

Create and manage multiple organizations, each with its own base currency, time zone, and settings.

## Events

Zoho Inventory supports **outgoing webhooks** through its workflow automation system. Webhooks are configured as actions within workflow rules and send HTTP/HTTPS notifications to external URLs when specified events occur.

### Workflow-Based Webhooks

- **Description:** Webhooks can be triggered as part of workflow rules configured within Zoho Inventory. A workflow rule is defined on a module (e.g., Sales Orders, Invoices, Contacts, etc.) and triggers when a record is created, edited, or on a date-based schedule.
- **Supported trigger types:** Event-based (when a record is created or edited) and date-based (relative to a date field, e.g., invoice due date).
- **Configurable parameters:** The module to watch, the trigger condition (created/edited), advanced filter criteria on field values, and the external URL to notify. Entity parameters from the triggering record can be included in the webhook payload.
- **Considerations:** Webhooks are configured through the Zoho Inventory UI under Settings > Automation > Workflow Actions, not via the API. This feature is available only on select pricing plans.

### Incoming Webhooks

- **Description:** Zoho Inventory also supports incoming webhooks, which allow external services to trigger custom Deluge scripts within Zoho Inventory by posting data to a generated URL. These are used to push data _into_ Zoho Inventory from external systems.
- **Configurable parameters:** A Deluge function that processes the incoming payload. Both OAuth-secured and ZAPI Key URLs are generated per webhook.
- **Considerations:** Incoming webhooks are configured through the UI under Settings > Incoming Webhooks, not via the REST API.
