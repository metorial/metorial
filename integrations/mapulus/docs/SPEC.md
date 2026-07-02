Now I have enough information to compile the specification. Let me also check for the Zapier triggers/actions more carefully and the location collection widget webhook feature.

# Slates Specification for Mapulus

## Overview

Mapulus is a GIS (Geographic Information System) platform based in Brisbane, Australia, that provides location-based insights for businesses. It allows users to plot locations on maps, define travel boundaries (isochrones), manage territories, visualize data through heat maps and clustering, and overlay demographic, traffic, and points-of-interest data. The platform offers a REST API, Zapier integration, and an embeddable location collection widget.

## Authentication

Mapulus uses **API key-based authentication** via Bearer tokens.

- **Method:** Bearer token in the `Authorization` header.
- **Header format:** `Authorization: Bearer <API_KEY>`
- **Base URL:** `https://api.mapulus.com/api/v1/`

To obtain an API key, users must have a Mapulus account. The API key can be used across multiple domains and usage is pooled across all implementations.

**Example request:**

```
GET https://api.mapulus.com/api/v1/maps
Authorization: Bearer YOUR_API_KEY
```

## Features

### Map Management

Create and manage maps within Mapulus. Maps serve as the top-level organizational unit that contains layers and locations. You can list all maps associated with your account.

### Layer Management

Organize map data using layers, which enable you to categorize and group location markers, making it easier to manage and visualize data. Layers exist within a map and contain locations.

### Location Management

Create new locations and update existing locations in Mapulus. Locations are added to a specific layer within a map. Each location includes:

- **Title** — a name or label for the location.
- **Latitude and Longitude** — geographic coordinates.
- **Address** — the street address of the location.
- **Custom attributes** — store essential details and search for relevant information for your business and each location.

### Nearby Location Search

The API offers a feature for finding locations nearby a specified latitude/longitude or address, enabling automated location searches.

### Travel Boundaries (Isochrones)

Add travel ranges (also known as drive time or travel isochrones) to a location on your map. By defining a travel range, you can visualise areas within a certain distance or time from a specific location.

### Territory and Boundary Lookup

Identify which locations fall within a specific territory. This feature is accessible through the map interface and via the API for more automated, programmatic access. Mapulus has official local Australian boundaries built into its system, encompassing suburbs, postcodes, government Local Government Areas (LGAs), and more.

### Location Collection Widget

An embeddable JavaScript widget that collects addresses from end users and enriches them with contextual data. Enriched location data is sent to your webhook or API endpoint in real-time for immediate action. Enrichment includes:

- Population density, age distribution, income levels, household composition.
- Drive times to key locations, public transport access, walkability scores.
- Nearby competitors, market saturation, service gaps in the area.
- Configurable data points specific to your business needs.

### Bulk Data Import

Mapulus simplifies data management with its bulk upload feature and user-friendly API, allowing you to integrate large datasets into the system effortlessly.

## Events

Mapulus supports limited event mechanisms through its Zapier integration and webhook delivery from the Location Collection Widget:

### New Location Trigger

Triggers when a new Location is added to a Map. Available via Zapier. Can be used to detect when locations are created in Mapulus and trigger downstream workflows.

### New Map Trigger

Triggers when a new Map is created. Available via Zapier. Can be used to detect when new maps are set up in the account.

### Location Collection Webhook

Real-time webhook delivery to your CRM, database, or analytics platform. Fires when an end user submits a location through the embeddable Location Collection Widget, delivering enriched location data to a configured endpoint.

Note: These event mechanisms are primarily available through Zapier's polling-based triggers and the widget's webhook delivery. There is no documented native webhook subscription API for general map or location change events.
