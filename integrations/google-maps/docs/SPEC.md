# Slates Specification for Google Maps

## Overview

Google Maps Platform is a suite of APIs and SDKs by Google that provides geospatial data and mapping services. It is organized into four main categories—Maps, Routes, Places, and Environment—covering Android, iOS, and web platforms, with web service APIs for address validation, aerial view, air quality, directions, geocoding, geolocation, datasets, tiles, places, pollen, roads, routes, route optimization, solar, and time zone.

## Authentication

### API Key (Primary Method)

Google Maps Platform APIs and SDKs require API keys or, where supported, OAuth 2.0 to authenticate.

- API keys link API calls to your billing account. Create one by going to the Google Maps Platform Credentials page in the Google Cloud Console and selecting "Create credentials" then "API key."
- API keys are passed as a query parameter (`key=YOUR_API_KEY`) on HTTP requests.
- For client-side applications running on end user devices, API keys are the recommended authentication method.
- Keys can be restricted by application type (HTTP referrers, IP addresses, Android apps, iOS apps) and by specific APIs.
- A Google Cloud project with billing enabled is required.

### OAuth 2.0 (Service Account)

The intended use case for OAuth 2.0 with Maps Platform is for the developer to utilize temporary access tokens for authorizing their application to call an API on behalf of their Google Cloud project service account.

- OAuth 2.0 is recommended for authorizing server-to-server calls between a developer's trusted server-side applications and Google's Maps Platform servers.
- A service account is required—an account that belongs to your application, not an individual end user. Your application calls APIs on behalf of the service account.
- The OAuth token uses the scope `https://www.googleapis.com/auth/cloud-platform`. The Google Cloud project ID with billing enabled must be passed in the `X-Goog-User-Project` header.
- Not all Maps Platform APIs support OAuth 2.0; check individual API documentation for support. Newer APIs (e.g., Places API (New), Address Validation, Aerial View, Routes, Datasets, Air Quality, Solar, Pollen) generally support it.

## Features

### Geocoding and Address Handling

- The Geocoding API converts between addresses and geographic coordinates. Supports forward geocoding (address to coordinates) and reverse geocoding (coordinates to address).
- The Address Validation API validates an address and its components, standardizing it for mailing and identifying issues like misspellings or missing data.
- The Geolocation API provides location data from cell towers and Wi-Fi nodes, useful for approximate device positioning when GPS is unavailable.

### Places

- Using a place ID, you can request details about a particular establishment or point of interest, returning comprehensive information such as complete address, phone number, user rating, and reviews.
- Supports text-based search, nearby search, place autocomplete, and place photos.
- AI-generated summaries of places and areas are available via Gemini integration.
- Place types cover a wide range of categories (restaurants, EV charging stations, hospitals, etc.).

### Routes and Directions

- Provides directions with real-time traffic for multiple modes of transport, calculates travel times and distances. Supports driving, walking, cycling, and transit.
- The Routes API computes route matrices (origins-to-destinations travel times and distances).
- Route Optimization optimizes multi-stop routes for one or more vehicles, useful for fleet logistics and delivery planning.
- Waypoints can be specified (up to 25 for directions requests).

### Roads

- The Roads API parses through GPS crumbs and snaps them back onto the road, addressing inaccuracies of GPS data.
- Identifies nearby roads and their speed limits using coordinates.

### Static Maps and Street View

- Maps Static API provides simple, embeddable map images with minimal code. Maps can be customized with markers, paths, and styling via URL parameters.
- Street View Static API provides real-world imagery and panoramas. Retrieves 360° imagery for a given location or heading.

### Map Tiles

- The Map Tiles API provides high-resolution Photorealistic 3D Tiles, 2D Tiles, and Street View Tiles for building immersive, customized map visualizations.

### Elevation

- The Elevation API provides elevation data for any point in the world, including the ocean floor. Accepts single points or paths for sampling.

### Aerial View

- The Aerial View API creates and displays aerial view videos rendered using Google's 3D geospatial imagery. Provides cinematic fly-over videos for a given address.

### Environmental Data

- The Air Quality API provides air quality data for a specific location, including pollutant levels and health recommendations.
- A Pollen API provides pollen count and allergen data for a location.
- The Solar API allows calculating the potential for solar energy on individual roofs.
- The Weather API provides current weather conditions, hourly and daily forecasts, and hourly weather history for locations across the globe.

### Time Zone

- Determines the time zone for a given location and timestamp. Returns the time zone ID and UTC offset.

### Datasets

- The Maps Datasets API lets you upload and manage your geospatial data in the Google Cloud Console for use with data-driven styling on maps.

### Embedded Maps

- The Maps Embed API allows adding a Google Map to a website via an iframe without code, supporting place, directions, search, and Street View modes. This API has no usage cost.

## Events

The provider does not support events. Google Maps Platform is a stateless request-response API suite and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
