# Loyverse Specification

## Overview

Loyverse is a cloud-based point-of-sale (POS) system for small and medium-sized businesses such as retail stores, cafes, and restaurants. It provides inventory management, sales processing, customer loyalty tracking, employee management, and business analytics. The API (base URL: `https://api.loyverse.com/v1.0`, reference: https://developer.loyverse.com/docs/) enables programmatic access to manage products, sales, customers, inventory, and more.

## Authentication

Loyverse supports two authentication methods:

### 1. Personal Access Token

A simple token-based method that provides unrestricted access to all API resources. The token is unrestricted in scope.

- Tokens are created in the Loyverse Back Office under the "Access Tokens" section. Click "+ Add access token", fill in a name, optionally set an expiration date, and save. The token is shown once and should be copied for use.
- The token gives unlimited access to all resources provided by the Loyverse API. Up to 20 tokens can be created for one account.
- The token is sent as a Bearer token in the `Authorization` header: `Authorization: Bearer YOUR_ACCESS_TOKEN`

### 2. OAuth 2.0 (Authorization Code Flow)

This follows the OAuth 2.0 Authorization Code Flow. This method is intended for third-party applications that act on behalf of Loyverse users.

- Create an account on the Loyverse Developer Portal and generate API credentials (Client ID and Client Secret).
- **Authorization URL:** `https://api.loyverse.com/oauth/authorize`
  - Required parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope` (space-separated, e.g., `ITEMS_READ STORES_READ`), `state`
- **Token URL:** `https://api.loyverse.com/oauth/token`
  - Exchange the returned authorization code for an `access_token` and `refresh_token` via POST to `/oauth/token`.
  - Content-Type must be `application/x-www-form-urlencoded`.
- OAuth 2.0 supports scoped access to resources (e.g., `ITEMS_READ`, `STORES_READ`), unlike Personal Access Tokens which grant full access.
- Access tokens expire (`expires_in`, typically 12 hours) and are refreshed with `grant_type=refresh_token` at the same token URL.

## Features

### Item & Catalog Management

Create, read, update, and delete items (products) in the catalog. Items support variants (e.g., sizes), SKUs, pricing, cost tracking, and images. Variants can be looked up directly, including by SKU, to get the variant IDs used by receipts and inventory. Items can be organized into categories with names and colors. Modifiers (e.g., "Size" with options like Small/Medium/Large and price adjustments) can be created and assigned to items.

- Items and variants can be filtered by created/updated timestamps to retrieve recently changed products.
- Create and update requests are POST upserts: including an `id` updates the existing object.

### Inventory Management

Track and set stock levels for item variants across multiple store locations. Inventory levels can be queried by variants, stores, or update time; updates set the absolute stock (`stock_after`).

- To get the stock of items, use the "Inventory" endpoint, not the "Items" endpoint.

### Sales & Receipts

Create sales receipts and retrieve historical transaction data. Receipts include line items, payments, discounts, and tax information. Refund receipts can also be created for existing sales by referencing the line item IDs of the original receipt.

- Receipts created via API can't have more than one payment.
- Refunds can only be created for receipts paid with a single payment type.
- Refunds do not support receipts paid via integrated payments (e.g., SumUp, iZettle); those must be refunded through the POS app.
- If a refund is created successfully, it will cause a restock of items specified in a refund receipt.

### Customer Management

Create, read, update, and delete customer records. Customers can be looked up by ID or email. Customer data includes name, email, phone, address, visit history, total spent, and loyalty points.

### Discount Management

Create and manage discounts that can be applied to sales. Supported types are `FIXED_PERCENT`, `FIXED_AMOUNT`, `VARIABLE_PERCENT`, `VARIABLE_AMOUNT`, and `DISCOUNT_BY_POINTS`. Discounts can be applied at the receipt level or line-item level when creating receipts.

### Employee Management

Read employee information including roles and details. Employees can only be read via the API. Create, update, and delete operations must be done through the Loyverse Back Office.

### Store Management

Retrieve information about store locations, including store IDs, names, and configuration.

### Tax Configuration

Create and manage tax rates that can be applied to items and receipts.

### Payment Types

Retrieve the list of payment types configured for the account (e.g., cash, card).

### Supplier Management

Create, read, update, and delete supplier records for inventory sourcing.

### Shift Management

Access closed shift data including open/close times, cash drawer totals, sales totals, and the employees who opened and closed each shift.

### Merchant Information

Retrieve account-level merchant information.

## Events

Loyverse supports webhooks for receiving real-time notifications when certain events occur. There are 3 ways of creating webhooks: via the Back Office UI, via the webhook API endpoint using an Access Token, or via the webhook API endpoint using OAuth 2.0.

Only webhooks created via OAuth 2.0 will include the `X-Loyverse-Signature` header for payload verification.

When creating a webhook, you specify a target URL and one or more event types to subscribe to.

Supported event types (one per webhook): `receipts.update`, `items.update`, `inventory_levels.update`, `customers.update`, and `shifts.create`.

### Receipt Events

Notifies when a receipt (sale or refund) is created or updated. Useful for syncing sales data to external accounting or analytics systems.

### Item Events

Notifies when items (products) are created, updated, or deleted. Useful for keeping external catalogs in sync.

### Inventory Events

Notifies when inventory/stock levels change. Useful for syncing stock data with external warehouse or e-commerce systems.

### Customer Events

Notifies when a customer record is created, updated, or deleted. Useful for syncing customer data to external CRM systems.

### Shift Events

Notifies when a closed shift is created. Useful for tracking cash register sessions.
