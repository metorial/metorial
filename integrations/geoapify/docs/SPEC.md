# Slates Specification for Geoapify

## Overview

Geoapify is a location platform that provides geospatial APIs built on OpenStreetMap data, covering geocoding, routing, places search, map tiles, reachability analysis, and geometry operations. It serves as a comprehensive suite for building location-based applications, offering services like address lookup, route optimization, isolines, boundary queries, and IP geolocation.

## Authentication

Geoapify uses API keys for authentication. To begin using the Geoapify APIs, you will need an API key, which can be obtained by signing up on the Geoapify website.

- **Method:** API Key passed as a query parameter (`apiKey`) on every request.
- **Obtaining a key:** Sign up for a free account at geoapify.com, create a new project on the MyProjects page, and go to the API Keys section to generate one or multiple API keys for your project.
- **Key restrictions:** You can protect your API key by specifying allowed IP addresses, HTTP referrers, origins, and CORS.
- **Usage example:** `https://api.geoapify.com/v1/geocode/search?text=Berlin&format=json&apiKey=YOUR_API_KEY`

There is no OAuth2 or token-based authentication. All API calls are authenticated solely via the `apiKey` query parameter.

## Features

### Geocoding (Forward & Reverse)

Geoapify's Geocoding API converts addresses into coordinates, returning confidence levels to help verify result correctness. It accepts both structured and free-form addresses and supports location filters and preferred geographical areas to make searches more accurate. Reverse geocoding converts GPS coordinates back into structured addresses. The Geocoding API supports multiple languages.

- Supports free-form text queries or structured address components (street, city, postcode, etc.).
- Bias results by proximity to a point, or filter by bounding box, circle, or country.
- Returns confidence levels at building, street, and city levels.

### Address Autocomplete

The Address Autocomplete API lets you create address forms that collect addresses, providing address suggestions for a given address string.

- Designed for real-time type-ahead address input fields.

### Postcode Lookup

Search for postcodes by geographic coordinates or retrieve a list of postcodes within a defined area. The Postcode API provides detailed location metadata and geometry.

- Query by text, radius, bounding box, or administrative area.

### IP Geolocation

IP Geolocation detects a user's location by IP address. The result also contains information about the user's country and languages.

- Can detect the caller's own IP or look up a specific IP address.

### Routing

The Routing API calculates routes between two or more waypoints, building routes for automobiles, delivery trucks, cargo vans, bicycles, motor scooters, and walking. Results include directions and turn-by-turn navigation instructions. You can customize routes to avoid specific road types and locations, and request speed limits, elevation profiles, and detailed navigation instructions.

- Supports 12+ travel modes (drive, truck, bike, hike, scooter, transit, etc.).
- Route avoidance options: toll roads, ferries, highways, tunnels, bridges, specific countries.
- Route optimization by time or distance.

### Route Matrix

Generate a time-distance matrix between multiple points. Supports drive, truck, bicycle, and walk travel modes.

- Useful for calculating travel times/distances between many origin-destination pairs.

### Route Planner (VRP Solver)

The Route Planner API integrates route planning and schedule optimization, providing optimal routes between multiple locations for multiple vehicles or agents. It tackles challenges such as TSP, Capacitated VRP, VRP with Time Windows, Multi-depot Heterogeneous Vehicle VRPTW, and Pickup-and-delivery with Time Windows.

- Accepts locations, capacities, time windows, and vehicle constraints.
- Returns optimized visit order and schedules.

### Map Matching

Map Matching API snaps given geographical coordinates (GPX) to the existing road network, allowing you to choose a desired travel mode. The API returns reconstructed route geometry as well as details about road segments, including speed limit, road surface, and more.

- Accepts up to 1000 location points per request.
- Useful for fleet management, route analysis, and driving behavior monitoring.

### Places Search

The Places API enables querying local points of interest and amenities. Search for places in a city, within a radius, within a reachability area/isoline, or within a bounding box. Query by category (accommodations, shops, parking, etc.) and apply conditions like wheelchair accessibility or Wi-Fi availability.

- Supports approximately 400 POI categories.
- Hierarchical category system (e.g., `catering.restaurant`, `accommodation.motel`).

### Place Details

The Place Details API queries additional information about a place or location, including place geometry (e.g., building geometry) and records about place surroundings. It works in conjunction with the Isolines API to get amenities reachable from a given place.

- Request features like nearby supermarkets, ATMs, restaurants within walking/driving isolines.

### Boundaries

The Boundaries API returns the administrative boundaries that a specified place is part of — for example, city, county, state, and country for a location. It can also return boundaries that a place consists of, such as states for a country or districts for a city.

- Accepts place ID or coordinates as input.
- Returns GeoJSON geometries of boundary polygons.

### Isolines (Isochrones & Isodistances)

The Isoline API provides isochrones (areas reachable within a specific travel time) and isodistances (areas reachable within a specific travel distance).

- Supports ranges up to 60 minutes for isochrones and 60 kilometers for isodistances.
- Supports multiple travel modes: drive, trucks, bikes, pedestrian, and more.
- Can exclude toll roads, ferries, highways, or specific locations.
- Incorporates an approximated traffic model for more accurate travel time calculations.
- Supports multiple ranges in a single request and union/intersection of isoline results.

### Geometry & Geometry Operations

Perform 40+ geometry operations on GeoJSON data — transformations, measurements, spatial predicates, clustering, and more.

- Union and intersection of polygons and multi-polygons.
- Useful for combining isoline results or performing spatial analysis.

### Map Tiles & Static Maps

Use map tiles as a base map layer, or create PNG/JPG map pictures using the Static Maps API. Multiple map styles and colors are available.

- Vector and raster map tiles based on OpenStreetMap.
- Static map image generation with markers.
- Marker Icon API for generating customizable map marker icons with Font Awesome and Material icons.

### Batch Processing

Geocode up to 1000 addresses at once with batch requests. Batch mode is available for most API endpoints and can be used to process large volumes of data in a single request.

## Events

The provider does not support events. Geoapify is a stateless geospatial data API platform with no webhooks, event subscriptions, or built-in polling mechanisms.
