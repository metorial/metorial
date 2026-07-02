Let me get the full API v5 reference to understand all available methods and features.Now I have enough information to compile the specification. Let me put it together.

# Slates Specification for Simla.com

## Overview

Simla.com (formerly RetailCRM) is an omnichannel CRM platform designed for eCommerce and small businesses. It unifies communication channels like WhatsApp, Facebook, and Instagram into a single inbox and is designed to turn customer interactions into sales opportunities. It allows managing and segmenting customer bases, tracking transactions and orders, distributing tasks between managers, managing store assortments and inventory, and automating routine processes.

## Authentication

Authorization is performed using an API key, which can be passed as a GET/POST parameter `apiKey` or via the HTTP header `X-API-KEY`.

**Base URL:** Requests must be sent to `https://{your-subdomain}.simla.com/api/{version}/` where `{your-subdomain}` is your account's subdomain and `{version}` is the API version (currently `v5`).

**Obtaining an API key:**
The list of API access keys is located in the "Integration" section of the system's administrative settings. To create a new API key, click the "Add" button. The key token is generated automatically and is a unique set of symbols used to bind the store to the system. The token length must be at least 32 characters.

**Scoping:**
You can allow access only to specific API methods using a given API key. This is useful when you need to give the API key to third parties who should not have access to all data.

If the API key provides access to the data of several stores, then in some API methods it is additionally required to specify the symbolic code of the store in the `site` parameter.

**Example:**

```
GET https://demo.simla.com/api/v5/orders?apiKey=YOUR_API_KEY
```

or with header:

```
X-API-KEY: YOUR_API_KEY
```

## Features

### Customer Management

Manage individual and corporate customer profiles including contact information, demographics (e.g., sex), segments, and notes. Customers can be combined (merged) into a single record. Corporate customers are supported as a separate entity type with their own migration process from regular customers. Customer notes can be created, listed, and deleted. Files can be attached to customers.

### Order Management

Create, edit, retrieve, and upload orders. Orders contain line items referencing product trade offers, delivery information, discounts, VAT rates, payments, and custom fields. Two orders can be combined, with the content merged according to a specified strategy. Order history tracks incremental changes to all order fields over time.

### Product Catalog (Store)

Retrieve product listings with SKUs (trade offers), including images, units of measurement, and product group assignments. Products are organized into groups. Inventory and warehouse system integration is supported.

### Delivery Integration

The delivery integration API allows calculating delivery costs, managing delivery terminals, forming delivery orders with packages, editing and deleting delivery orders, bulk-updating delivery statuses, and generating printable shipping documents. Delivery services are registered as integration modules with callback-based architecture.

### Telephony Integration

Telephony integration supports incoming call notifications, outgoing call notifications, and call hangup events. User status in the system can be changed to synchronize with an external telephony system.

### Customer Segmentation

Retrieve a list of customer segments and synchronize customer segments with an external system. Segment data is available on customer records.

### Custom Fields and Dictionaries

Custom fields can be created and managed for various entities (customers, orders, etc.). Custom data books (dictionaries) can be created and edited to provide lookup values for custom fields.

### Reference Data

Manage system reference data including order statuses, payment types, delivery types, order methods, stores (with geo-coordinates), units of measurement, and other configurable lookups.

### Integration Modules

Integration modules can be registered and configured via a unified method that supports delivery, telephony, and other module types. Modules define callback URLs that the system uses for communication. A simple connection flow is available for partner modules involving HMAC-based token verification.

### Users

Retrieve system users and manage their statuses for integration with external systems.

### Change History

Incremental change history is available for orders and customers, enabling synchronization of data changes with external systems such as warehouse or loyalty systems. Each change is represented as a separate record with old and new values.

### File Attachments

Files can be attached to and managed on both orders and customers.

## Events

Simla.com does not offer a native webhook subscription mechanism through its API. Instead, it provides **incremental history APIs** (`/api/v5/orders/history`, `/api/v5/customers/history`) that serve as a purpose-built polling mechanism for tracking changes.

### Order History

Tracks all incremental changes to orders, including status changes, field edits, item modifications, delivery updates, discount changes, and order combinations. Consumers poll using a `sinceId` parameter to retrieve only new changes since the last processed record.

- Configurable filters by store and time range.
- Each history entry contains the changed field name, old value, and new value.

### Customer History

Tracks all incremental changes to customer records, including profile updates, segment changes, type conversions (e.g., regular to corporate customer), and merges. Uses the same `sinceId`-based polling pattern as order history.

- Configurable filters by store and time range.
- Each history entry contains the changed field name, old value, and new value.
