# Slates Specification for Graphhopper

## Overview

GraphHopper is a routing and logistics API platform built on OpenStreetMap data. It provides route calculation, route optimization (vehicle routing problems), distance/time matrix computation, geocoding, map matching, isochrone generation, and clustering services. The API is available as a hosted cloud service or as a self-hosted open-source routing engine.

## Authentication

GraphHopper authenticates API requests by passing an API key as a query parameter in every request. The query parameter is named `key`.

**Example request:**

```
https://graphhopper.com/api/1/route?point=51.131,12.414&point=48.224,3.867&key=YOUR_API_KEY
```

API keys can be created from the GraphHopper dashboard. The API key is used to authenticate you when you request the API.

There is no OAuth2 or other authentication method. The API key is the sole authentication mechanism.

**Base URL:** `https://graphhopper.com/api/1/`

## Features

### Routing

Calculates the best path connecting two or more points, where the meaning of "best" depends on the vehicle profile and use case. Besides path coordinates it can return turn-by-turn instructions, elevation, path details and other useful information about the route.

- Supports multiple vehicle profiles (car, bike, foot, truck, etc.).
- Custom models can modify the routing behaviour of a specified profile, allowing users to avoid, exclude, or prefer certain areas or road classes.
- Points can be re-ordered to minimize the total travel time when more than two points are specified.
- Supports alternative routes, round trips, and heading preferences.

### Route Optimization

The Route Optimization API can be used to solve traveling salesman or vehicle routing problems.

- Handles real-world constraints such as time windows, vehicle capacities, driver skills, and vehicle types.
- Supports pickup and delivery problems, multiple vehicles, and multiple depots.
- Can minimize completion time or transport time.
- Supports modeling multiple delivery routes with a single vehicle.

### Distance/Time Matrix

The Matrix API calculates distances and times between multiple start and destination locations. It can compute full NxN matrices or asymmetric matrices with separate origin and destination sets.

- Returns distances (meters), times (seconds), and weights.
- Can handle cases where some points are not connected, returning null values for invalid entries.

### Geocoding

Geocoding transforms a textual address representation to a coordinate (latitude, longitude). Reverse geocoding converts a coordinate to a textual address representation or place name.

- Supports multiple geocoding providers (default, nominatim, gisgraphy, OpenCageData). Each provider has its own strengths and might fit better for certain scenarios.
- Currently, only the default provider and gisgraphy support autocompletion of partial search strings.
- Can filter results by country, bounding box, and OSM tags.

### Isochrone / Isodistance

An isochrone of a location is a line connecting points at which a vehicle arrives at the same time. The same API can also calculate isodistances using the `distance_limit` parameter instead of `time_limit`.

- Useful for reachability analysis and service area visualization.

### Map Matching

Snaps measured GPS points (typically GPX files) to a digital road network to clean data or attach information like elevation or turn instructions to it.

- Request size should not exceed the Map Matching API location limit depending on the package.

### Clustering

Solves the "capacity clustering problem" by assigning a set of customers to a given number of distinct groups (clusters), minimizing the total distance from each individual customer to its designated group median. It can also consider minimum and maximum capacity restrictions for each group.

- Useful for territory planning, territory optimization for field teams, or breaking down large vehicle routing problems.

### Custom Profiles

Custom profiles can be created using the `/profiles` endpoint. These allow users to define custom routing behavior such as excluding motorways, restricting to specific geographic areas, or preferring certain road types. Custom profile IDs (prefixed with `cp_`) can then be used in routing and optimization requests.

## Events

The provider does not support events. GraphHopper is a stateless computation API focused on routing and geospatial calculations, and does not offer webhooks or event subscription mechanisms.
