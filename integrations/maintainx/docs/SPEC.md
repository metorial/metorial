Let me get the actual API documentation from MaintainX.Let me try to fetch the actual API docs page to get the full list of resources.Now let me try to fetch the actual API reference to get more detail on the available endpoints and webhooks.Now I have enough information to compile the specification. Let me create it based on all the research.

# Slates Specification for Maintainx

## Overview

MaintainX is a mobile-first maintenance-management and asset-management platform providing work-order tracking, preventive maintenance, inspections, parts and inventory management, and real-time communication tools for field teams. It is a cloud-based computerized maintenance management system (CMMS) for web and mobile that helps organizations centralize maintenance data, communication, and workflows.

## Authentication

MaintainX uses **API Key (Bearer Token)** authentication for its REST API.

To obtain an API key, log in to your MaintainX account, click Settings > Integrations > New Key, then click Generate Key and copy the API Key to a safe place.

All API requests must include the API key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_api_key>
```

The base URL for the API is `https://api.getmaintainx.com/v1/`.

**Multi-Organization Support:** The API supports a "Multi-Organization Token." If you are working with one of these, you also need to provide your Organisation ID via the `x-organization-ids` header. If you don't know your MaintainX Org IDs, your MaintainX representative can provide them.

## Features

### Work Order Management

Create, retrieve, update, and list work orders. Work orders can be reactive (one-off) or preventive (recurring/scheduled). Preventive work orders are for scheduled maintenance or other recurring scheduled work. Reactive work orders are for responding to one-off events like machine breakdowns or urgent repairs. You can update work order status, add comments, assign categories, set priorities, and manage custom fields (extra fields). Work orders support assignees, assets, locations, procedures, and due dates.

### Work Requests

You can create work requests that can then be reviewed and converted into work orders. This enables a request-then-approve workflow for maintenance tasks.

### Asset Management

Create, retrieve, and manage assets including their metadata, descriptions, and custom fields. Track assets over time with meters and readings (like PSI and mileage). Instantly see the historical performance of assets using barcodes and QR codes. Assets support hierarchical relationships (parent/child).

### Locations

The Locations feature provides all of the locations you have created and added to Assets, Work Orders, Vendors, and Teams. You can create locations in advance or add them as you create and assign Assets and Work Orders.

### Parts and Inventory

Monitor your parts inventory, and get alerts when stocks run low. The API allows managing parts records, tracking stock levels, and associating parts with work orders and assets.

### Meters and Readings

Meters are checked by technicians who record readings in MaintainX. Meters help prevent emergency maintenance issues by allowing you to monitor equipment performance. Meters are a tool to support condition-based or predictive maintenance. There are manual meters (checked by a technician) and automated meters (where readings are automatically transferred via the REST API or from an integrated data source, such as a sensor).

### Purchase Orders

A purchase order specifies the types, quantities, and prices for items your organization buys. Usually, a purchase order is for parts defined in your parts inventory that you purchase from a vendor. Purchase orders don't have to have a vendor defined, and you can add items that aren't in your parts inventory.

### Vendors

Vendors can be managed and listed. You can add new vendors, supplying information like email addresses, phone numbers, files, locations, and assets.

### Users and Teams

A user is a person in your MaintainX organization with an account and an assigned role. Each role has a different set of permissions. A team consists of users with similar roles or functions in a MaintainX organization. They work on assigned tasks, share information, and can be associated with specific locations, assets, or functions.

### Messaging

You can create new messages in conversations. This enables programmatic communication within MaintainX threads, for example adding messages to work order conversations.

### Categories

Categories help delineate Work Orders according to your own needs and purposes. You can add existing categories to work orders via the API.

### Reporting / Data Export

The API supports exporting data in CSV format (e.g., work orders, assets) for use in BI tools like Power BI. Endpoints are available at paths such as `/v1/workorders/workorders.csv`.

## Events

The MaintainX API does not provide a native webhook subscription mechanism for receiving real-time push notifications about changes. Integration platforms like Zapier use polling-based triggers (e.g., "Triggers when a new work order is created") rather than native MaintainX webhooks. There is no documented webhook registration or event subscription API in MaintainX's official REST API.

The provider does not support events.
