Let me get the full API method list to understand all features and check for webhook support.The page didn't load fully. Let me search for the full method list.Now let me get the full method list from the BaseLinker API to understand all feature categories.Now let me check for the journal/log system which seems to be their event mechanism:Now I have enough information to write the specification.

# Slates Specification for Baselinker

## Overview

BaseLinker (now also known as Base.com) is an e-commerce management platform that integrates with marketplaces, online stores, couriers, and accounting systems. It centralizes order processing, inventory management, product catalog management, and shipment handling across multiple sales channels. The API enables data exchange between external systems and BaseLinker using JSON over a single POST endpoint.

## Authentication

BaseLinker uses **API token** authentication. There is a single authentication method:

- **API Token**: The token is assigned directly to the BaseLinker user account. Users can generate an API token in the BaseLinker panel under "Account & other -> My account -> API" section.

**How to authenticate:**

All requests are sent as POST requests to `https://api.baselinker.com/connector.php`.

Authorization with the HTTP header `X-BLToken` is recommended. Pass the token as the value of this header. The request body contains two POST fields: `method` (the API method name) and `parameters` (a JSON-encoded string of arguments).

**Example:**

```
curl 'https://api.baselinker.com/connector.php' \
  -H 'X-BLToken: YOUR-API-TOKEN' \
  --data-raw 'method=getOrders&parameters={"date_from":1407341754}'
```

There are no OAuth flows, scopes, or additional credentials required. A single API token grants access to all API methods available on the account.

## Features

### Product Catalog

Manage the BaseLinker product catalog (inventory). Create, update, and retrieve products with detailed data including variants, images, prices, descriptions, and custom attributes. Manage product inventories (warehouses), categories, manufacturers, and product-level stock quantities and prices. Supports linking products across multiple sales channels.

### Inventory Documents

Manage inventory documents (warehouse documents) for tracking stock movements such as goods received, internal transfers, and stock adjustments within BaseLinker warehouses.

### Inventory Purchase Orders

Create and manage purchase orders in BaseLinker storage. Orders are created as drafts by default. Track procurement from suppliers including order items, quantities, and fulfillment status.

### Inventory Suppliers and Payers

Manage inventory suppliers and inventory payers associated with purchase orders and inventory documents.

### External Storages

Interact with external storages (connected shops and warehouses). Retrieve product lists, quantities, and prices from external platforms connected to BaseLinker. Due to different performance of external warehouses, different integration methods and their specific requirements, the response standard may differ from the one described in the documentation.

### Orders

Manage orders across various online sales channels. Create new orders, retrieve order lists (filtered by date, status, ID, email, or phone), update order fields and statuses, manage order products (add/remove items), add payments, set invoice data, and manage order-level custom fields. Supports fetching order sources and configurable order status workflows.

- Orders can be filtered to include or exclude unconfirmed orders.
- Supports adding receipts and invoices to orders.

### Order Returns

Manage order returns for processing customer return requests and refunds related to existing orders.

### Courier Shipments

Manage courier services including listing available couriers, retrieving courier service options, creating packages, getting shipping labels, and requesting parcel pickups. Supports tracking packages associated with orders.

- Courier availability depends on which courier integrations are active on the BaseLinker account.

## Events

BaseLinker does not support traditional webhooks. Instead, it provides a purpose-built **Journal (event log) polling mechanism** via the `getJournalList` API method.

### Order Journal

The method allows you to download a list of order events from the last 3 days. If this method is not enabled for your account, it may return an empty response — in such case, make sure it is enabled in your account API settings.

The journal can be polled using a `last_log_id` cursor to retrieve only new events since the last poll. Events can be filtered by `logs_types` to subscribe to specific event categories:

- **Order Creation**: Triggered when a new order is created. Filterable via the "create new order" log type.
- **Order Status Change**: Triggered when an order's status is changed. Filterable via the "change order status" log type.
- **Order Removal**: Triggered when an order is removed. Filterable via the corresponding log type.

Each log entry includes the log ID, log type, associated order ID, object ID, and timestamp. Events can also be filtered by a specific `order_id`.

- The journal only retains events from the last 3 days.
- The feature must be explicitly enabled in the account's API settings.
