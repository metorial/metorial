Let me get more details on the CloudCart webhooks page and look for the full API documentation.Now I have enough information to write the specification. Let me also check the Zapier integration page for more details on available triggers/actions.I have enough information now to write the specification.

# Slates Specification for Cloudcart

## Overview

CloudCart is a SaaS e-commerce platform that enables businesses to create and manage online stores. The CloudCart API enables you to interact programmatically with your CloudCart store, offering endpoints to manage products, orders, customers, and more. With CloudCart's REST API, you can integrate external systems and share resources and information with high security and controlled access.

## Authentication

CloudCart supports API key-based authentication for its REST API (v2).

CloudCart uses API keys for authentication. API keys can be created and managed from the store's admin panel under **Settings > API keys**. Each store has a "Default" API key that is automatically created.

To authenticate requests, include the API key in the request header:

- **Header name:** `X-CloudCart-ApiKey`
- **Header value:** Your API key

The API base URL is store-specific and follows this pattern:

```
https://{domain}.cloudcart.net/api/v2/
```

Where `{domain}` is your store's unique CloudCart subdomain.

**Required credentials:**

- **Domain** – Your store's CloudCart subdomain (the part before `.cloudcart.net`)
- **API Key** – Generated from Settings > API keys in the store admin panel

Note: Some sources reference OAuth 2.0 (Authorization Code Grant and Client Credentials Grant) as a possible authentication method, but the primary and most commonly documented method is API key authentication via the `X-CloudCart-ApiKey` header.

## Features

### Product Management

Create, read, update, and delete products in the store. This includes managing product details such as descriptions, pricing, images, variants (color, size, etc.), availability, and stock quantities. Custom product types can be created to fit specific business needs. Supports bulk operations for product edits, quantities, variants, and statuses.

### Order Management

Access and manage orders including order details, line items, shipping information, and payment data. Orders include statuses such as: pending, voided, timeouted, cancelled, failed, refunded, paid, and complete. Orders also carry payment statuses (requested, pending, held, completed, failed, refunded, cancelled, timeouted) and fulfilment statuses (not_fulfilled, fulfilled).

### Customer Management

Manage customer records including registration details, contact information, and order history. Triggers are available when a new customer is added to a CloudCart account.

### Category Management

Organize products into categories and manage the store's category hierarchy. Import and export entire categories along with their products.

### Inventory Management

Keep inventory levels in check by syncing them between CloudCart and external systems whenever a sale is made or new stock is added. Track stock quantities and prevent overselling.

### Webhook Management

Create and configure webhooks programmatically via the API to receive notifications about store events. Webhooks are associated with API keys and send data to specified destination URLs.

## Events

CloudCart supports webhooks that send event data to a specified destination URL when store events occur. When an event occurs, information is sent to the endpoint via an API key. Webhook event data can be stored as JSON or XML.

Webhooks are configured in the admin panel under **Settings > Webhooks** by specifying an API key, a destination URL, and the event trigger.

### Order Events

Receive notifications when orders are created or their status changes. For example, if there is a new order, the action will execute the webhook to the destination of the specified URL. Order webhooks include order status (pending, voided, timeouted, cancelled, failed, refunded, paid, complete), payment status, and fulfilment status.

### Product Events

Triggers are available when a product is updated or when a new product is created.

### Customer Events

Triggers when a new customer is added to the CloudCart account.

**Webhook delivery considerations:** After 6 unsuccessful attempts, if the information is not received, it will not be sent again. If response codes 400, 401, 403, 404, 405, 406, 410, 411 are received, the webhook will be deactivated. If the response text contains "please unsubscribe me", the webhook will be deleted.
