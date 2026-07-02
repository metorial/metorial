Let me get the activity types list for webhooks.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Route4me

## Overview

Route4Me is a cloud-based route optimization and logistics platform that solves vehicle routing and traveling salesman problems. It enables dispatchers and field-service personnel to plan, manage, and execute delivery or pickup routes. It supports geocoding addresses, creating and optimizing routes, managing customers, importing orders, dispatching routes to drivers and vehicles, tracking assets, and more.

## Authentication

Route4Me uses API key authentication for all API requests. Route4Me authenticates your API requests using your private API key.

- **Type:** API Key
- **Parameter:** `api_key`
- **Delivery method:** Query string parameter on every request
- **Key format:** 32-character alphanumeric string
- **How to obtain:** Go to "Security" in the Navigation Menu and click "API Key". Or go to "Account", click "Account Settings", and then tap "API Key" under "Integrations" in the side menu.

Example request:

```
https://api.route4me.com/api.v4/optimization_problem.php?api_key=YOUR_API_KEY
```

All requests must be made over HTTPS.

## Features

### Route Optimization

Create and solve optimization problems by providing a set of addresses/destinations with constraints. Optimization refers to a collection of destinations that need to be visited, considering all the addresses and constraints associated with each destination, address, and depot. Supports multiple algorithm types including TSP (Traveling Salesman Problem), CVRP (Capacitated Vehicle Routing Problem) with time windows and multiple depots. Configurable parameters include route max duration, vehicle capacity, travel mode (driving, walking, etc.), distance units, optimization target (distance, time), and time windows per stop.

- A Route is a sequence of addresses that need to be visited by a single vehicle and driver within a fixed period. Solving an optimization produces one or more routes.
- Supports dynamic routing, continuous route re-optimization, time-sensitive time-windows, route re-balancing, just-in-time re-routing, and Class 1-8 truck routing with height, weight, tunnel, and bridge constraints.

### Route Management

Create, read, update, duplicate, merge, and delete routes. Assign drivers and vehicles to routes. Resequence stops within routes, add or remove addresses, and rename routes. Routes can recur in the future.

### Order Management

Import customer orders from CRMs and other systems, and plan and manage order routes. Orders can be associated with optimization problems for route generation.

### Address Book (Contacts)

Add, edit, group, and manage data for millions of addresses and customers. The address book serves as a centralized contacts/destinations database that can be used when creating routes and optimizations.

### Geocoding

Convert street addresses into geographic coordinates (latitude/longitude) and perform reverse geocoding. Used internally for route optimization and available as a standalone feature.

### GPS Tracking

GPS tracking refers to the surveillance of a location with a GPS unit to track the location of an entity or object remotely. Track device locations in real-time, with a perpetual GPS tracking history per route and device. The telematics gateway supports real-time data ingestion from over 500 different telematics vendors.

### Team Member Management

Manage users associated with your account. Route4Me uses a role-based security model supporting user types: Account Owner, Administrator, Regional Manager, Route Planner, Dispatcher, Analyst, and Driver.

### Vehicles

Manage your fleet of vehicles, including their properties and constraints (capacity, max distance, vehicle type). Vehicles can be assigned to routes.

### Notes & Attachments

A note refers to an assigned text note to a route or address object. Notes can include text and multimedia attachments and are commonly used by drivers for proof of delivery.

### Avoidance Zones & Territories

Define geographic areas that routes should avoid (avoidance zones) or define service territories for organizing operations geographically.

### Activity Feed

Route4Me's Activity Feed is an auditing tool that can be used by the Account Owner for auditing all routing-related events and data transfers performed by all users associated with the Primary Route4Me Account. Activities can be filtered by date, activity type, and user.

## Events

Route4Me supports webhooks via the Activity Feed callback mechanism. Under "Integrations", click "Activity Feed Webhook", input your webhook URL into the "Callback URL" field and click "Save" to finalize. Webhooks are set at the Account Owner user level, and activities logged by the account owner, drivers, and other sub-users are all automatically sent to the defined callback URL.

- Route4Me supports 10 retry attempts in case of HTTP status code issues.
- To access the webhook settings, enable the Audit Logging and Activity Stream Add-On on your account.

### Avoidance Zone Events

Notifications when avoidance zones are created, updated, or removed.

### Route Destination Events

Notifications when addresses/stops are added to, removed from, or resequenced within a route. Also triggered when address attributes or custom data are updated.

### Driver Arrival Events

Notifications when a driver arrives at a destination early, late, or on time.

### Geofence Events

Notifications when a driver enters or leaves a geofenced area (geofence check-in and check-out).

### Address Visit/Departure Events

Notifications when an address is marked as visited or departed by a driver.

### Route Lifecycle Events

Notifications for route-level changes including route optimization/reoptimization, route deletion, route duplication, route merging, route renaming, and route owner/assignment changes.

### Team Member Events

Notifications when team members are created, deleted, or modified.

### Note Events

Notifications when a note is added to a stop or address within a route.

### User Message Events

Notifications when users communicate via the built-in two-way real-time chat feature.

### Approval Events

Notifications when a route is approved for execution.
