Now let me get the full webhook documentation and the Swagger API docs to understand all the endpoints:Now let me get the Swagger API to understand the available endpoints:Let me try to fetch the Swagger spec directly to get the actual endpoints:I now have enough information to write the specification. Based on my research, the API documentation at `rest.boxhero-app.com/docs/api` is a Swagger UI page that I cannot fetch programmatically, but from all the documentation, integration pages, and webhook docs, I can construct a comprehensive specification.

# Slates Specification for Boxhero

## Overview

BoxHero is an inventory management platform for small businesses, trusted by over 300,000 users in 100+ countries. It provides real-time stock level updates across locations, barcode scanning and printing, and team collaboration features. The platform supports four core inventory transaction types: Stock In, Stock Out, Adjust Stock, and Move Stock.

## Authentication

BoxHero uses **Bearer Token (API Key)** authentication.

All API requests must include an Authorization header with a Bearer token. The format is:

```
Authorization: Bearer {API_TOKEN}
```

**Obtaining an API Token:**

1. Log into your BoxHero account on the Desktop (Web), navigate to Settings > Integrations, and generate a new API token.

**Base URL:** `https://rest.boxhero-app.com`

**Additional details:**

- Access may be limited based on plan level; a plan upgrade may be required for full API usage.
- Certain API features (such as the location lookup API) may not be available depending on the team's mode (e.g., Basic Mode vs. Business Mode).
- Each API token is scoped to a specific team. There are no configurable OAuth scopes.

## Features

### Item Management

Retrieve and manage inventory items within a team. Each item has a unique barcode number and SKU, along with custom attributes such as size, color, or manufacturer. Items include fields like name, SKU, barcode, cost, price, photo URL, and custom attributes. Items can be filtered by location.

- BoxHero supports decimal values for inventory quantities (e.g., 1.9 or 0.28).

### Inventory Transactions

The API allows updating inventory using stock adjustments and stock transfers, and pulling inventory data. Transactions cover the four core types:

- **Stock In**: Record items entering inventory (e.g., purchases, returns).
- **Stock Out**: Record items leaving inventory (e.g., sales, shipments).
- **Adjust Stock**: Modify quantities for corrections like damage or loss.
- **Move Stock**: Transfer inventory between locations.

Each transaction records the location, partner (supplier/customer), items with quantities, timestamp, and memo. Transactions can be listed and filtered.

### Locations

Locations represent physical places where inventory is stored, such as warehouses, stores, or stockrooms. The API allows retrieving location data. Multiple locations require the Business Plan.

### Partners

Partners include both Suppliers and Customers connected to inventory transactions, with contact information stored and managed in the Data Center. The API allows retrieving partner information.

- Suppliers are linked to Stock In transactions, while Customers are linked to Stock Out transactions.

### Attributes

Custom attributes can be defined to add additional metadata to items (e.g., category, expiration date, safety stock level). These are returned as part of item data via the API.

## Events

BoxHero supports webhooks that allow you to receive real-time notifications when certain events occur. Webhooks are registered at Settings > Integrations & API in the BoxHero team.

When an event occurs, BoxHero sends an HTTP POST request to the registered webhook endpoint with a JSON payload describing the event. If the server responds with any non-200 status code, BoxHero retries delivery up to 3 times. BoxHero does not guarantee the order of event delivery.

### Transaction Events

- **`txs/new`**: Triggered when a new inventory transaction occurs (Stock In, Stock Out, Adjust Stock, or Move Stock). The payload includes the transaction type, location(s), line items with quantities and updated stock levels, partner, timestamp, and the member who created it. Note: this event is not triggered for adjustments created through bulk edits or Excel imports.
- **`txs/edit`**: Triggered when an existing inventory transaction is edited. Includes the same fields as `txs/new` plus a revision number.
- **`txs/delete`**: Triggered when an inventory transaction is deleted. Includes the transaction ID and revision number.

### Item Events

- **`item/new`**: Triggered when a new item is added to the team's inventory. The payload includes item ID, name, SKU, barcode, photo URL, cost, price, and custom attributes. Note: not triggered when using the "Add Item Variants" feature or importing items via Excel.
- **`item/edit`**: Triggered when an existing item is edited. Same payload fields as `item/new`. Note: not triggered for bulk edits through Data Center or Excel import.
- **`item/delete`**: Triggered when an item is deleted. Includes only the item ID. Note: not triggered for bulk deletions through Data Center.
