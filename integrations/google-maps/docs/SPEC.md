# Slates Specification for Google Maps

## Overview

Google Maps Platform is a suite of APIs and SDKs by Google that provides geospatial data and mapping services. It is organized into four main categories—Maps, Routes, Places, and Environment—covering Android, iOS, and web platforms, with web service APIs for address validation, aerial view, air quality, directions, geocoding, geolocation, datasets, tiles, places, pollen, roads, routes, route optimization, solar, and time zone.

## Authentication

### API Key (Primary Method)

This integration exposes API-key authentication. Google Maps Platform also supports OAuth 2.0 for some APIs, but this integration does not currently expose an OAuth or service-account auth method.

- API keys link API calls to your billing account. Create one by going to the Google Maps Platform Credentials page in the Google Cloud Console and selecting "Create credentials" then "API key."
- Legacy Maps web services receive the API key as a query parameter. Places API (New) requests send it in the `X-Goog-Api-Key` header.
- For client-side applications running on end user devices, API keys are the recommended authentication method.
- Keys can be restricted by application type (HTTP referrers, IP addresses, Android apps, iOS apps) and by specific APIs.
- A Google Cloud project with billing enabled is required.

## Features

### Geocoding and Address Handling

- The Geocoding API converts between addresses and geographic coordinates. Supports forward geocoding (address to coordinates) and reverse geocoding (coordinates to address).
- The Address Validation API validates an address and its components, standardizing it for mailing and identifying issues like misspellings or missing data.
- The Geolocation API provides location data from cell towers and Wi-Fi nodes, useful for approximate device positioning when GPS is unavailable.

### Places

- Using a place ID, you can request details about a particular establishment or point of interest, returning comprehensive information such as complete address, phone number, user rating, and reviews.
- Supports text-based search, nearby search, place autocomplete, and place photos.
- `autocomplete` calls `POST /v1/places:autocomplete` with a fixed response field mask for place/query text, structured text, place IDs and resource names, types, and origin distance. Inputs cover Google session tokens, type and region restrictions, cursor offset, origin, service-area/future businesses, and circular location bias or restriction. Bias and restriction are mutually exclusive.
- `(cities)` and `(regions)` must each be used alone in `includedPrimaryTypes`. Query predictions cannot be combined with `includedRegionCodes` because Google does not return query predictions when region restrictions are present.
- Autocomplete session tokens are optional but recommended. Create a URL-safe token of at most 36 characters (UUID v4 is recommended), reuse it while the user types, then pass the same token to `get_place_details` for the selected place. Do not reuse a completed session token.
- `get_place_details` includes current `photos[].name`, dimensions, and `authorAttributions` in its field mask and output. Photo names can expire and must not be cached. Display every returned author attribution with the related image.
- `get_place_photo` appends `/media` to a current photo name and requests `skipHttpRedirect=true` with the API key. It validates the returned short-lived Google media URL, then downloads it through a separate unauthenticated HTTP client so the API key cannot reach the media host.
- Place photo requests require `maxWidthPx`, `maxHeightPx`, or both. Each value must be an integer from 1 through 4800. Downloads are limited to 52,428,800 bytes, require a supported image MIME type and matching file signature, and return bytes only through one Slate attachment. Temporary media URLs and base64 content never appear in structured output.
- AI-generated summaries of places and areas are available via Gemini integration.
- Place types cover a wide range of categories (restaurants, EV charging stations, hospitals, etc.).

The private live suite resolves a current photo name through Place Details for every run. It intentionally does not store a photo-name fixture because Google prohibits caching photo names and names can expire. Live Places coverage requires Places API (New) and billing to be enabled for the API-key project.

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
