Let me get the actual API documentation to confirm webhook event types and OAuth scopes.Now I have good information. Let me also check the integration platform triggers to confirm the full list of webhook event types, since the Ruby gem only lists 3 but Integrately listed more.

Based on my research, here's the specification:

# Slates Specification for Loyverse

## Overview

Loyverse is a cloud-based point-of-sale (POS) system for small and medium-sized businesses such as retail stores, cafes, and restaurants. It provides inventory management, sales processing, customer loyalty tracking, employee management, and business analytics. The API (base URL: `https://api.loyverse.com`) enables programmatic access to manage products, sales, customers, inventory, and more.

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
- **Authorization URL:** `https://cloud.loyverse.com/oauth/authorize`
  - Required parameters: `client_id`, `redirect_uri`, `response_type=code`
  - Optional: `scope` (e.g., `ITEMS_READ`, `STORES_READ`)
- **Token URL:** `https://api.loyverse.com/oauth/token`
  - Exchange the returned authorization code for an `access_token` and `refresh_token` via POST to `/oauth/token`.
  - Content-Type must be `application/x-www-form-urlencoded`.
- OAuth 2.0 supports scoped access to resources (e.g., `ITEMS_READ`, `STORES_READ`), unlike Personal Access Tokens which grant full access.
- The client will automatically refresh the access token when it expires using the refresh token.

## Features

### Item & Catalog Management

Create, read, update, and delete items (products) in the catalog. Items support variants (e.g., sizes), SKUs, pricing, cost tracking, and images. Items can be organized into categories with names and colors. Modifiers (e.g., "Size" with options like Small/Medium/Large and price adjustments) can be created and assigned to items.

- Items can be filtered by update timestamp to retrieve recently changed products.
- Receipts created via API can't have more than one payment type.

### Inventory Management

Track and update stock levels for item variants across multiple store locations. Inventory levels can be queried by variant or by store.

- To get the stock of items, use the "Inventory" endpoint, not the "Items" endpoint.

### Sales & Receipts

Create sales receipts and retrieve historical transaction data. Receipts include line items, payments, discounts, and tax information. Refund receipts can also be created for existing sales.

- Refunds can only be created for receipts paid with a single payment type.
- Refunds do not support receipts paid via integrated payments (e.g., SumUp, iZettle); those must be refunded through the POS app.
- If a refund is created successfully, it will cause a restock of items specified in a refund receipt.

### Customer Management

Create, read, update, and delete customer records. Customers can be looked up by email or phone number. Customer data includes name, email, phone, address, city, and postal code.

### Discount Management

Create and manage discounts that can be applied to sales. Supports both percentage-based and fixed-amount discounts. Discounts can be configured to apply at the receipt level or item level.

### Employee Management

Read employee information including roles and details. Employees can only be read via the API. Create, update, and delete operations must be done through the Loyverse Back Office.

### Store Management

Retrieve information about store locations, including store IDs, names, and configuration.

### Tax Configuration

Create and manage tax rates that can be applied to items and receipts.

### Payment Types

Retrieve the list of payment types configured for the account (e.g., cash, card).

### POS Device Management

Create, read, update, and delete POS device configurations.

### Supplier Management

Create, read, update, and delete supplier records for inventory sourcing.

### Shift Management

Access shift data including open/close times and associated employee information.

### Merchant Information

Retrieve account-level merchant information.

## Events

Loyverse supports webhooks for receiving real-time notifications when certain events occur. There are 3 ways of creating webhooks: via the Back Office UI, via the webhook API endpoint using an Access Token, or via the webhook API endpoint using OAuth 2.0.

Only webhooks created via OAuth 2.0 will include the `X-Loyverse-Signature` header for payload verification.

When creating a webhook, you specify a target URL and one or more event types to subscribe to.

### Receipt Events

Notifies when a new receipt (sale) is created or updated. Useful for syncing sales data to external accounting or analytics systems.

### Item Events

Notifies when items (products) are created, updated, or deleted. Useful for keeping external catalogs in sync.

### Inventory Events

Notifies when inventory/stock levels change. Useful for syncing stock data with external warehouse or e-commerce systems.

### Customer Events

Notifies when a customer record is created, updated, or deleted. Useful for syncing customer data to external CRM systems.

### Shift Events

Notifies when a shift is created (closed and synced to the Back Office). Useful for tracking employee work periods.

### Employee Events

Notifies when employee records are created or updated.

### Store Events

Notifies when store records are created or updated.
