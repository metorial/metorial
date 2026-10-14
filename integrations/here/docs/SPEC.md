# HERE Integration Specification

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

### Geocoding and Search

Geocode free-form, qualified, and hybrid address queries; reverse geocode coordinates; discover or browse places; retrieve autosuggest or address autocomplete results; and look up a place by its HERE identifier. Discover and autosuggest require a geographic search context. Browse requires a search center.

### Routing and Reachability

Calculate road routes for cars, trucks, bicycles, pedestrians, scooters, taxis, and buses. Road bus routing describes a vehicle journey rather than a public transit itinerary. Route results include the requested geometry, actions, tolls, elevation, and routing notices. Matrix routing supports synchronous calculations with explicit or automatically derived regions. Isoline routing returns reachable-area boundaries and origin or destination details.

### Public Transit

Calculate public transit journeys through the Transit API, including walking connections, departure or arrival planning, mode filters, transfer limits, wheelchair accessibility, and route details. Results retain provider route identifiers, sections, station information, and line details. Transit coverage depends on the available agency data.

### Traffic, Weather, and Positioning

Retrieve traffic flow and incidents for a geographic area. Retrieve current weather, forecasts, astronomy, and alerts; weather output also includes the complete provider report with location metadata. Estimate device position from WLAN, GSM, and LTE measurements.

### Tour Planning

Submit a synchronous vehicle routing problem with fleet types, profiles, costs, shifts, capacities, jobs, service times, and time windows. Retrieve optimized tours, unassigned jobs, and solution statistics. Large problems remain subject to the provider's synchronous limits.

## Connection and Coverage Limits

The integration accepts an API key or a manually supplied bearer access token. It does not issue or automatically refresh bearer tokens; replace them when they expire. Individual APIs require the relevant application service access. Map rendering, geofencing, route matching, asynchronous jobs, and full electric-vehicle consumption configuration are not exposed by the tools.

## Events

The provider does not support events. HERE Technologies APIs are request-response based REST services and do not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
