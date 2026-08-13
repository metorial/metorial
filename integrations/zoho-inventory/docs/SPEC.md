Let me get more details on the API navigation/full list of resources and the OAuth scopes, as well as confirm webhook details specific to Zoho Inventory.Now let me get the full OAuth scopes list from the OAuth page:Now I have all the information I need. Let me compile the specification.

# Zoho Inventory Integration Specification

## Overview

Zoho Inventory is a cloud-based inventory management application that is part of the Zoho suite. It provides tools for tracking stock levels, managing orders (sales and purchase), invoicing, shipping, and warehouse management across multiple locations. The API allows programmatic access to all operations available in the web client.

## Authentication

Zoho Inventory uses OAuth 2.0 as its sole authentication method. The integration exposes one OAuth method for a customer-owned regular regional or Multi-DC server application. `applicationType` is required. `region` is required for a regional application and optional for Multi-DC as an expected-region constraint.

### Setup

1. Register a regular regional or Multi-DC server application at the [Zoho Developer Console](https://accounts.zoho.com/developerconsole) and supply its Client ID and Client Secret when connecting.
2. Regional authorization starts at the selected regional Accounts origin. Multi-DC authorization starts at `https://accounts.zoho.com/oauth/v2/auth`.
3. Treat callback `location` and `accounts-server` as optional routing hints. Validate every supplied hint and require both to agree when present. Without either hint, use the selected regional origin, or try only the supported Accounts origins for a regionless Multi-DC application until Zoho accepts the code. Multi-DC discovery requires shared OAuth credentials across enabled data centers. The resolved region must match the regional selection or an optional Multi-DC expected-region constraint.
4. Refresh requests use the persisted regional Accounts origin and preserve the existing refresh token when Zoho omits a replacement.
5. Inventory requests and organization discovery use the allowlisted `api_domain` returned by Zoho.

### Passing Tokens

The access token must be passed in the `Authorization` header as: `Zoho-oauthtoken {access_token}`

### Data Centers

The validated callback Accounts origin determines code exchange and refresh routing. Inventory requests use the matching allowlisted API origin returned in the token response:

| Region | Accounts origin | Allowed Inventory API origin |
| --- | --- | --- |
| US | `https://accounts.zoho.com` | `https://www.zohoapis.com` |
| EU | `https://accounts.zoho.eu` | `https://www.zohoapis.eu` |
| IN | `https://accounts.zoho.in` | `https://www.zohoapis.in` |
| AU | `https://accounts.zoho.com.au` | `https://www.zohoapis.com.au` |
| JP | `https://accounts.zoho.jp` | `https://www.zohoapis.jp` |
| CA | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca` |
| SA | `https://accounts.zoho.sa` | `https://www.zohoapis.sa` |
Connections created with the previous region-specific OAuth methods must reconnect with the unified `oauth` method and select their region. The previous Inventory mapping sent Japan and Saudi Arabia authorizations to the US Accounts server, so existing JP and SA connections must be treated as mis-homed and reconnected explicitly.

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

#### Declared Scope Contract

```ts
[
  'ZohoInventory.FullAccess.all',
  'ZohoInventory.contacts.READ',
  'ZohoInventory.contacts.CREATE',
  'ZohoInventory.contacts.UPDATE',
  'ZohoInventory.contacts.DELETE',
  'ZohoInventory.items.READ',
  'ZohoInventory.items.CREATE',
  'ZohoInventory.items.UPDATE',
  'ZohoInventory.items.DELETE',
  'ZohoInventory.inventoryadjustments.CREATE',
  'ZohoInventory.inventoryadjustments.DELETE',
  'ZohoInventory.transferorders.READ',
  'ZohoInventory.transferorders.CREATE',
  'ZohoInventory.transferorders.UPDATE',
  'ZohoInventory.transferorders.DELETE',
  'ZohoInventory.salesorders.READ',
  'ZohoInventory.salesorders.CREATE',
  'ZohoInventory.salesorders.UPDATE',
  'ZohoInventory.salesorders.DELETE',
  'ZohoInventory.packages.CREATE',
  'ZohoInventory.packages.DELETE',
  'ZohoInventory.shipmentorders.READ',
  'ZohoInventory.shipmentorders.CREATE',
  'ZohoInventory.shipmentorders.UPDATE',
  'ZohoInventory.shipmentorders.DELETE',
  'ZohoInventory.invoices.READ',
  'ZohoInventory.invoices.CREATE',
  'ZohoInventory.invoices.UPDATE',
  'ZohoInventory.invoices.DELETE',
  'ZohoInventory.customerpayments.CREATE',
  'ZohoInventory.customerpayments.DELETE',
  'ZohoInventory.creditnotes.READ',
  'ZohoInventory.creditnotes.CREATE',
  'ZohoInventory.creditnotes.UPDATE',
  'ZohoInventory.creditnotes.DELETE',
  'ZohoInventory.purchaseorders.READ',
  'ZohoInventory.purchaseorders.CREATE',
  'ZohoInventory.purchaseorders.UPDATE',
  'ZohoInventory.purchaseorders.DELETE',
  'ZohoInventory.bills.READ',
  'ZohoInventory.bills.CREATE',
  'ZohoInventory.bills.UPDATE',
  'ZohoInventory.bills.DELETE',
  'ZohoInventory.settings.READ'
]
```

| Capability group | Requested scope |
| --- | --- |
| Contact, item, transfer-order, sales-order, shipment-order, invoice, credit-note, purchase-order, and bill CRUD | The matching documented READ, CREATE, UPDATE, and DELETE scopes listed above |
| Inventory-adjustment, package, and customer-payment creation/deletion | The matching documented CREATE and DELETE scopes listed above |
| Warehouse and organization discovery | `ZohoInventory.settings.READ` |
| Product-wide resource access | `ZohoInventory.FullAccess.all` |

The [Zoho Inventory OAuth documentation](https://www.zoho.com/inventory/api/v1/oauth/) documents resource-level CREATE, READ, UPDATE, and DELETE operations, but not resource-level ALL. The exact operations above correspond to current tool and polling-trigger calls; unused composite-item, sales-return, and purchase-receive namespaces and unused operation variants are omitted.

The integration requests the documented operation-specific scopes used by current tools and triggers, plus `ZohoInventory.FullAccess.all` for product-wide resource access. Unused namespace and operation variants are omitted.
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
