# Slates Specification for OptimoRoute

## Overview

OptimoRoute is a route planning and optimization platform for deliveries and field service operations. It provides tools for creating and scheduling orders, optimizing multi-stop routes for drivers, tracking order completion, and managing driver/vehicle parameters. The platform includes a mobile app for drivers and supports proof of delivery with signatures, photos, barcodes, and custom forms.

## Authentication

OptimoRoute uses a single **API key** for authentication. The API key parameter is required with all API requests. To enable the API and generate the key, log into the OptimoRoute web application.

An authentication key is required for using the OptimoRoute web service API. You can generate your API key in the **Administration → Settings → WS API** section of the OptimoRoute application.

The key is passed as a query parameter named `key` on every request:

```
https://api.optimoroute.com/v1/{endpoint}?key=AUTH_KEY
```

Using SSL (https) is required to avoid passing the authentication key and confidential data in clear text over the web.

There are no OAuth flows, scopes, or additional credentials required. The API is available during the free trial period and on all pricing plans.

## Features

### Order Management

Create, update, retrieve, search, and delete orders (deliveries, pickups, or tasks). Orders include properties such as location (address or GPS coordinates), date, duration, time windows, priority, load requirements, required driver skills, vehicle features, custom fields, and customer contact details for notifications. Orders can be linked as pickup-delivery pairs. Supports single and bulk operations (up to 500 orders per request). Operations include `CREATE`, `UPDATE`, `SYNC` (full replace), and `MERGE` (partial update). Address geocoding is available on single order creation.

### Route Optimization (Planning)

Trigger the route optimization engine for a specific date or date range (weekly planning). Configurable options include:

- **Route balancing**: off, balanced, or force-use-all-drivers; balance by working time or number of orders.
- **Start mode**: plan from scratch or build on existing routes, with optional locking of existing routes or driver assignments.
- **Depot trips**: allow drivers to return to the warehouse for reloading within their shift.
- **Clustering**: minimize overlap between driver routes.
- **Selective planning**: specify a subset of orders and/or drivers to include.

Planning runs asynchronously. You can check its status (percentage complete) and stop it programmatically.

### Route Retrieval

Retrieve planned routes for a given date, optionally filtered by driver or vehicle. Returns an ordered list of stops per driver route with scheduled times, arrival times, travel time, and distance. Optionally includes encoded route polylines for map display and route start/end locations.

### Scheduling Information

Look up the scheduling status and details of individual orders, including which driver is assigned, the stop number on the route, scheduled service time, and travel distance/time from the previous stop. Bulk retrieval is available via the search orders feature.

### Order Search

Search for orders across a date range (up to 35 days) with optional filtering by order status (e.g., scheduled, success, failed, rejected, cancelled). Can include full order data and scheduling information in results. Supports cursor-based pagination.

### Driver Management

Update driver parameters for specific dates, including enabling/disabling drivers, adjusting working hours, assigning vehicles, setting vehicle load capacities, and changing start/end locations. Supports both single and bulk updates (up to 500 per request). Updating driver parameters for a date unschedules any existing routes for that driver on that date.

### Driver Position Tracking

Push driver GPS positions into OptimoRoute from external sources. Accepts timestamped latitude/longitude coordinates with optional speed, heading, and accuracy. Supports bulk updates for multiple drivers.

### Order Completion & Proof of Delivery

Retrieve detailed completion information for orders including status (unscheduled, scheduled, on_route, servicing, success, failed, rejected, cancelled), start/end times, GPS positions at service start/end, and proof of delivery data. Proof of delivery can include notes, digital signatures, photos, and barcode scan results (with statuses like success, unscannable, replaced, missing). Completion details can also be updated programmatically to set order statuses and timestamps. A real-time order tracking URL is provided per order when order tracking is enabled.

### Customer Notifications

Orders support a notification preference (email, SMS, both, or none) for sending order tracking notifications to customers. The customer's email and phone number are set on the order.

## Events

OptimoRoute provides a **polling-based event feed** via the Get Mobile Events endpoint. This is a purpose-built polling mechanism using cursor-based tags to retrieve new events incrementally.

### Mobile Events

Real-time events generated by drivers through the OptimoRoute mobile app. Each polling request returns up to 500 events that occurred after a specified cursor tag. The response includes a new tag for the next polling request.

Available event types:

- **on_duty / off_duty** – Driver went on or off duty.
- **start_route / end_route** – Driver started or ended their route.
- **start_service** – Driver started servicing an order.
- **success** – Order was completed successfully.
- **failed** – Driver failed to complete the order.
- **rejected** – Driver rejected the order.
- **start_time_changed** – Driver changed the planned route start time.

Each event includes timestamps (UTC, local, and Unix), driver identification, and for order-related events, the order number/ID and the driver's GPS position (with distance to the order location). Events may arrive out of chronological order due to mobile devices being temporarily offline.
