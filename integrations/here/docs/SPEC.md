# Slates Specification for Here

## Overview

HERE Technologies is a location data and technology platform that provides mapping, geocoding, routing, traffic, and positioning services. It offers REST APIs covering location intelligence use cases such as map rendering, address search, route calculation, fleet management, and real-time traffic data across 200+ countries.

## Authentication

HERE supports two primary authentication methods:

### 1. API Key

The HERE platform provides two ways of authenticating — OAuth 2.0 and API Keys. The API key is created and displayed. Your application and associated authentication credentials are specific to your app.

To use an API key, specify the key in the `apiKey` parameter in the request, for example:

```
https://geocode.search.hereapi.com/v1/geocode?q=240+Washington+St.,+Boston&apiKey={YOUR_API_KEY}
```

You can generate a maximum of two API Keys for your app. Trusted domains enable you to limit the use of your API Key credentials to the sites you specify. By default, any website can make requests to subscribed HERE services using your API Key. Add domains for each site that will make API calls with your API Key credentials.

### 2. OAuth 2.0 Bearer Token

The HERE Authentication and Authorization API is an OAuth 2.0 compliant REST API that allows you to obtain short-lived access tokens which you can use to authenticate requests to HERE services. Tokens expire after 24 hours.

Supported flows include OAuth2.0 client_credentials grant for confidential clients.

To obtain a token:

1. Register an app on the HERE platform to get an **Access Key ID** and **Access Key Secret**.
2. The request includes the following elements: Endpoint URL: `https://account.api.here.com/oauth2/token`
3. The HERE Authentication and Authorization API requires that you sign tokens using the signing process described in the OAuth Core 1.0 specification. The request is signed using HMAC-SHA256 with OAuth 1.0 headers.
4. The request body must contain `grant_type=client_credentials`.
5. The response returns a bearer access token valid for 24 hours.
6. Include the token in subsequent requests as: `Authorization: Bearer {YOUR_TOKEN}`

An optional scope can be added to the request body to request a project scoped access token.

## Features

### Geocoding & Search

Comprehensive geocoding and search functionality based on HERE's freshest database of addresses and POIs/Place information. Supports forward geocoding (address to coordinates), reverse geocoding (coordinates to address), autosuggest, and place/POI discovery. Access a comprehensive place data set with 400 Places categories and over 260 attributes, such as names, addresses, opening hours, reviews, and ratings.

### Routing

Calculate routes between waypoints for multiple transport modes including car, truck, bicycle, pedestrian, and public transit. Additional advanced location features include map attributes (access to premium features such as speed limits, traffic lights, dynamic EV PoI data and road curvature), EV charge-aware routing, matrix and isoline routing, waypoints sequencing, route matching, geofencing and more.

- **Matrix Routing**: Lets you request route summary matrices that are based on the routes between origins and destinations.
- **Isoline Routing**: Calculate reachable areas from a point based on time or distance constraints.
- **EV Routing**: The EV routing features extend the routing service with electric vehicle specific options. Routing responses can contain details of energy consumption of the vehicle on the route. Route calculations can also add charging stations to the route.
- **Toll Cost Calculation**: Calculate the total cost due for road usage and specify many toll-relevant vehicle parameters, like weight, width, length, height, trailer height or fuel type.

### Map Rendering

Render map tiles in raster and vector formats with customizable styles. Supports satellite imagery, terrain views, and fleet-specific overlays such as truck restriction attributes. Integrate personalized static map images into applications with access to a variety of styles and the ability to overlay custom data.

### Traffic

Returns detailed real-time traffic flow and incident information based on a spatial query. This includes all standard and advanced features, such as lane level traffic and deep coverage. For each segment of the road network that is covered, this API can provide speed values, along with additional information characterizing the traffic conditions and information for specific lanes of a multilane roadway, motorways, freeways and major roads.

### Tour Planning

With Tour Planning API, you can dynamically optimize routes for multiple vehicles visiting a set of locations given real-life constraints such as limited capacity in a vehicle or delivery time windows. Supports multi-depot vehicle routing, open-ended routes, mixed fleet types, and pickup-and-delivery scheduling.

### Geofencing

Geofencing API allows monitoring of mobile assets in reference to a geographic area inside/outside a geofence or distance to the next border. For each polygon geofence that covers the asset position or is close to it, the Fleet Telematics Geofencing returns the geofence geometry together with the asset's distance to this geometry.

### Positioning

Use radio network data to build applications requiring location estimates. This cloud-based service allows sub-meter positioning for mobile devices to offer improved overall position accuracy. Supports cellular and Wi-Fi network signal measurements.

### Destination Weather

The HERE Destination Weather API is a RESTful API that provides weather forecasts and reports on current weather conditions. The API provides solutions for the following high-level use cases: Get current weather reports or weather forecasts for a specific location. Check for severe weather alerts at a specific location.

### Fleet Telematics

Provides fleet-specific services including route matching (snapping GPS traces to roads), custom routing with truck-specific parameters, and access to road attributes like speed limits and truck restrictions. Improve telematic application with GPS road snapping feature to enrich GPS positioning with road attributes.

## Events

The provider does not support events. HERE Technologies APIs are request-response based REST services and do not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
