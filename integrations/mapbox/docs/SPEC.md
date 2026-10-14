# Mapbox Integration Specification

## Overview

Mapbox is a location data platform that provides APIs and SDKs for maps, navigation, search, and geospatial data. Mapbox APIs are divided into four distinct services: Maps, Navigation, Search, and Accounts. It enables developers to build applications with custom interactive maps, turn-by-turn directions, geocoding, and geographic data management.

## Authentication

Mapbox uses **access tokens** for API authentication. To access the Mapbox API endpoints, you need a valid access token, which will connect API requests to your account. You must supply a valid access token by using the `access_token` query parameter in every request.

There are three types of tokens:

- **Public tokens** (`pk.*`): Public tokens are designed to be used in client-side applications. They typically have limited permissions to access resources like tilesets, styles, datasets, and geocoding services. Public tokens restrict users from changing, deleting, or creating resources, granting only read access.

- **Secret tokens** (`sk.*`): These tokens often have broader permissions, allowing full access to Mapbox resources, including creating, modifying, and deleting resources such as tilesets, styles, datasets, etc. Since they provide elevated access, private tokens should never be exposed in client-side code. They are intended for environments where their confidentiality can be guaranteed, such as on a server or in an API.

- **Temporary tokens** (`tk.*`): Expire at a specified time, at most one hour after creation. Temporary tokens cannot be updated or revoked and must be replaced after expiry.

**Token Scopes**: The actions allowed by a token are based on scopes. A scope is a string that often is a resource type and action separated by a colon. For example, the `styles:read` scope allows read access to styles. Common scopes include `styles:read`, `fonts:read`, `uploads:read`, `uploads:write`, `datasets:read`, `datasets:write`, `tokens:read`, `tokens:write`, and `downloads:read`.

**URL restrictions**: You can add URL restrictions to a token to help prevent abuse of billable API endpoints with your token. When you define a token's allowed URLs, that token will only work for requests that originate from the URLs you specify.

Tokens are created either via the Mapbox Developer Console or programmatically through the Tokens API. Authentication is done by appending `?access_token=YOUR_TOKEN` to API request URLs. Mapbox uses JSON Web Tokens (JWT) as the token format.

## Features

### Map Tiles

The Mapbox Vector Tiles API serves vector tiles generated from Mapbox Studio styles. The Mapbox Raster Tiles API serves raster tiles generated from satellite imagery tilesets and tilesets generated from raster data uploaded to Mapbox.com. Tiles can be requested at various zoom levels and coordinates.

### Static Map Images

The Mapbox Static Images API returns downloadable map images with custom dimensions, markers, overlays, and viewport settings. The static_image tool supports optional PNG, JPEG, and WebP formats. Mapbox Standard and Standard Satellite styles, including custom styles importing them, are not supported. The existing imageUrl output is retained and includes the connected access token.

### Map Styles Management

The Mapbox Styles API lets you read and change map styles, fonts, and images. Users can create, update, list, and delete custom map styles. Styles control the visual appearance of maps including colors, labels, layers, and icons. Requires `styles:read` scope for reading and `styles:write` for modifications.

### Geocoding

The geocode tool retains Geocoding v5 forward and reverse requests for compatibility. The geocode_v6 tool adds current v6 text, structured address, and reverse searches with address match information. Points of interest are no longer provided by v5 and are not supported by these tools. Geocoding results are temporary; permanent storage is not enabled by the current tools.

### Connected Account

The who_am_i tool returns the token owner's username, token type, and authorization identifier when available. Temporary-token scopes and expiry are included when returned by Mapbox. Connection profiles use the owner username from the token validation response.

### Search Box

The Mapbox Search Box API is the easiest way to add interactive location search to connected cars, micro-mobility services, delivery apps, and more. Search Box API supports interactive location search or stand-alone queries to search addresses, places, and points of interest. It provides autocomplete suggestions, category search (e.g., coffee shops, hotels), and search along a route. The Search Box API supports United States, Canada and Europe.

### Directions and Routing

The Mapbox Directions API calculates optimal routes and produces turn-by-turn instructions. Supports driving, walking, and cycling profiles. Can account for real-time traffic conditions and provide alternative routes.

### Isochrone Analysis

The Mapbox Isochrone API computes areas that are reachable within a specified amount of time from a location. Useful for determining service areas and travel-time polygons.

### Matrix (Travel Times)

The Mapbox Matrix API returns travel times between many points. Useful for calculating distance/duration matrices for logistics and fleet optimization.

### Map Matching

The Mapbox Map Matching API snaps fuzzy, inaccurate traces to the road and path network. Useful for cleaning up GPS traces to match actual roads.

### Route Optimization

The Mapbox Optimization API returns a duration-optimized route between the input coordinates. Solves the traveling salesman problem for a set of waypoints.

### EV Charge Finder

The Mapbox EV Charge Finder API provides a cohesive set of services for EV use cases.

### Datasets Management

The Mapbox Datasets API supports reading, creating, updating, and removing features from a dataset. Using the Datasets API involves interacting with two types of objects: datasets and features. The Mapbox Datasets API offers persistent storage for custom geographic data. Features are stored as GeoJSON and can be individually managed. Requires `datasets:read` and `datasets:write` scopes.

### Data Uploads

The Mapbox Uploads API transforms geographic data into tilesets that can be used with maps and geographic applications. Supports various geographic data formats. Requires `uploads:read` and `uploads:write` scopes.

### Tiling Service (MTS)

Mapbox Tiling Service (MTS) is a tool for creating vector and raster tilesets. With MTS, you use sets of configuration options (tileset recipes) to transform your geospatial data into vector tiles. Provides more granular control over the tiling process compared to the Uploads API, including custom zoom levels and recipe-based configurations.

### Tilequery

The Mapbox Tilequery API allows you to retrieve data about specific features from rasterarray and vector tilesets. Enables querying for features near a specific point within hosted tilesets.

### Fonts Management

The Mapbox Fonts API provides you with a programmatic way to interact with fonts in your map styles. Allows uploading and managing custom fonts for use in map styles. Requires `fonts:read` and `fonts:write` scopes.

### Access Token Management

An access token provides access to Mapbox resources on behalf of a user. The Mapbox Tokens API provides you with a programmatic way to create, update, delete, and retrieve tokens, as well as list a user's tokens and token scopes. Requires `tokens:read` and `tokens:write` scopes.

## Events

The provider does not support events. Mapbox does not offer webhooks or server-side event subscription mechanisms through its APIs. The events referenced in Mapbox documentation relate to client-side SDK events (e.g., map interaction events in Mapbox GL JS) rather than server-to-server webhook or event subscription systems.
