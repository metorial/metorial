The fetched pages rendered mostly as navigation. Let me get the actual content from the webhook and authentication pages.Now let me get more details about the Shipday webhook events and partner API:Let me get more details on Shipday's specific webhook event types and the partner authentication:The fetched pages don't show body content due to JavaScript rendering. I have enough information from the search results to compile the specification. Let me also check the developer.shipday.com page for more details:I have sufficient information to write the specification now.

# Slates Specification for Shipday

## Overview

Shipday is a delivery management platform for local businesses such as restaurants, groceries, and other merchants. It provides delivery order dispatching, driver/carrier management, real-time delivery tracking, and a gateway to third-party on-demand delivery services like DoorDash and Uber. The API base URL is `https://api.shipday.com`.

## Authentication

Shipday API uses API key to authenticate requests. You can obtain your API key under "My Account" section in your Dispatch Dashboard.

The API is secured with HTTP Basic authentication. While making the request, you need to send the API key value with the `Authorization` key in the request header.

The header format is:

```
Authorization: Basic <YOUR_API_KEY>
```

Make sure to keep your API key secure and do not share it with anyone outside of your organization.

The API key format follows a pattern like `xxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxx` (a string with a dot separator).

There is also a separate **Partner API** with its own authentication for Shipday Partners that allows querying member orders and member details. Partners receive a distinct API key for partner-level access.

## Features

### Delivery Order Management

Create, retrieve, edit, and delete delivery orders. Orders include customer details (name, address, phone, email), pickup location, order items with pricing, delivery notes, payment method, expected pickup/delivery times, and fees (delivery fee, tips, tax, discounts). You can assign orders to specific carriers and query orders by various criteria such as time ranges. Orders can also be marked as ready for pickup and have their status updated manually.

- Orders support fields such as order number, customer address, pickup address, order items, delivery fee, tips, tax, and discount.
- Orders can be queried using filters like start time, and you can retrieve all orders from a specific time period.

### Pickup Order Management

Manage pickup-only orders separately from delivery orders. You can create, retrieve, edit, and delete pickup orders.

- Pickup orders have their own distinct object structure and endpoints, separate from delivery orders.

### Carrier (Driver) Management

Manage your fleet of carriers/drivers — retrieve all carriers, add new carriers, and delete carriers. Carriers are identified by name, email, and phone number.

- Carriers can be assigned to or unassigned from specific orders.

### Delivery Tracking

Track order delivery progress including ETA data, driving duration, and driving distance. This allows monitoring the real-time status and progress of a delivery.

### On-Demand Delivery Services

Connect to a network of third-party delivery services (e.g., DoorDash, Uber) through Shipday's Delivery Services Gateway.

- **Services**: List available third-party delivery service providers.
- **Availability**: Check which on-demand services are available for a given delivery.
- **Estimate**: Get delivery cost and time estimates from third-party providers before assigning.
- **Assign**: Assign an order to a specific third-party delivery service.
- **Details**: Retrieve on-demand delivery details for an assigned order.
- **Cancel**: Cancel an on-demand delivery assignment.

### Partner API

For Shipday Partners (platforms that integrate multiple Shipday merchant accounts), there is a dedicated API to retrieve member (merchant) details and query completed orders across members.

## Events

Shipday sends order update events via webhook subscription. Updates are sent over HTTP POST requests. Third-party systems need to provide an endpoint to receive webhooks.

### Order Status Updates

Receive real-time notifications when delivery order statuses change. The webhook payload includes the event type, order status, full order details (items, costs, timestamps, addresses), carrier/driver information, company details, and delivery details.

- Along with providing an endpoint, the third-party system can provide a validation token (max 32 characters) to validate the webhook payload. The validation token is sent in the webhook header as "token".
- Events cover the full order lifecycle including statuses like picked up, delivered, and other order state transitions (e.g., `ORDER_PIKEDUP` with `order_status: PICKED_UP`).
- The payload includes timestamps, order financial data, driver details, pickup/delivery addresses, and proof-of-delivery URLs.

### Driver Location Updates (Beta)

Receive real-time driver/carrier location updates during active deliveries. This webhook is currently in beta.

- Provides location coordinates for assigned drivers as they complete deliveries.
