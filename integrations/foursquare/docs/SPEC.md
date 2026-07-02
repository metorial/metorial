# Slates Specification for Foursquare

## Overview

Foursquare is a location technology company that provides a global database of over 100 million points of interest (POI) across 200+ countries. The Foursquare APIs provide access to tools and services, including Places, Personalization, Geofences, Studio Data, Measurement, and Targeting. The platform enables developers to build location-aware applications with venue search, place data enrichment, personalized recommendations, geofencing, and geospatial analytics.

## Authentication

Foursquare supports multiple authentication methods depending on the API product being used:

### API Key Authentication (Places API v3)

Authenticating against the API is done by passing your API Key through an `Authorization:` header parameter. API keys are generated in the Foursquare Developer Console. This is the primary method for the current Places API (v3).

Example:

```
curl --request GET \
  --url https://api.foursquare.com/v3/places/search \
  --header 'Accept: application/json' \
  --header 'Authorization: YOUR_API_KEY'
```

### OAuth 2.0 (Personalization API and Legacy v2 API)

Foursquare uses OAuth 2.0 to provide authorized access to the API. This is used for "user-ful" endpoints that require acting on behalf of a specific user.

There are two user models:

- **Foursquare Managed Users**: Managed users are users created solely for your application. Generate a Service API Key in your Foursquare Developer account. With the resulting Service API key, create a user via the User Management API. Upon user creation, a unique `access_token` and `userId` is included in the response.

- **Foursquare O&O Users**: O&O users are users of Foursquare's owned and operated apps; City Guide and Swarm. These users already have a Foursquare account which you can leverage for signing into your application, e.g. "Sign in with Foursquare". This uses a standard OAuth 2.0 web-based authorization flow.

When making subsequent calls to any of the Personalization API endpoints, make sure to include the user-specific `access_token` as a Bearer Authorization header.

### Legacy v2 Authentication

The legacy Foursquare API — denoted by v2 — uses OAuth for authentication allowing both "userless" and "user" auth methods. Both userless and user authentication methods require the use of your unique Client ID and Client Secret. This applies only to accounts created before November 2021.

## Features

### Place Search and Discovery

Access global POI data and rich content from 100K+ trusted sources via the API for real-time venue search, discovery, and ranking. Search for places by keyword, category, chain, or geographic area (lat/long, bounding box, or polygon). The Search & Data APIs go beyond basic proximity, allowing developers to filter places by category, features, hours, and more. Each result includes rich metadata like photos, reviews, ratings, and real-time popularity.

- Supports autocomplete for type-ahead search experiences.
- Results can be filtered by categories (using Category IDs or Category Codes) and chain IDs.
- Field selection allows requesting only specific data attributes in responses.

### Place Details and Rich Data

Retrieve detailed information about a specific place by its Foursquare ID. Data includes name, address, coordinates, categories, hours, contact info, photos, tips/reviews, ratings, popularity, venue tags (e.g., good for dogs, gluten-free diet), and related places.

- The Address Directory capability enables developers to display a directory of all POI at an address.

### GeoTagging / Place Match

The GeoTagging API pinpoints exact locations—from coffee shops to parks—with high accuracy using Foursquare's Place Snap technology. Place Match will match a user-provided name and location (address or lat/long) to a Foursquare POI. Useful for enriching in-house POI datasets with Foursquare data.

### Places Feedback / Placemaker

Places Feedback endpoints are available to all Places API users to propose changes to be incorporated into Foursquare Places data.

- Propose Place Edit: Enable app users or data processing pipelines to propose edits to Place attributes such as address, phone number, or category.
- Flag Problematic Place: Indicate an issue with a Place, such as a closed location, or correct the lat/long and label for a particular Place.
- Get Feedback Status: Store the ID of the feedback submission for checking the status of the update later.

### Personalized Recommendations

Leverage the global POI database alongside personalization algorithms to provide a personalized search experience unique to a user's specific tastes, visit history, review sentiment, and more.

- Requires user-ful OAuth authentication (per-user access tokens).
- Currently in Public Beta.

### Geofence Management

Geofences can be configured for specific venues, categories, chains, polygons, and arbitrary lat/lng points. The Geofence API allows programmatic creation, retrieval, updating, and deletion of geofences.

- Create the following types of geofences: around a Foursquare Venue, using a Custom Polygon, or around a Lat/Long Coordinate.
- Supports bulk operations (add up to 1,000, delete up to 100 at a time).
- Additional properties allow you to add custom metadata to each geofence event, where the additional properties will be appended to the event payload as a key-value pair.
- Designed to be used with the Foursquare Movement SDK on mobile devices.

### Studio Data Management

Create, manage, and modify geospatial assets used on Foursquare Studio. Integrate into your pipeline tasks for the bulk processing of geospatial data, allowing for the efficient flow of data into Studio.

- Upload, download, and update datasets.
- Manage who can see or edit assets stored in the Studio cloud.

### Measurement (MAPI)

Measurement API (MAPI) is a tool for accessing measurement data, powering everything from insights gathering to campaign optimization. MAPI combines unparalleled data granularity with a flexible syntax to put you in control of your report data.

### User Management

The Users API lets you manage authentication on behalf of your users so that they can use the Places API endpoints and Placemaker UI. Create managed users, retrieve user tokens, and refresh tokens.

## Events

Foursquare provides two webhook-based real-time push APIs (part of the legacy v2 API):

### User Push API

The User Push API will push to your application every time one of your users checks in (these users must have previously authorized your application). Your server will receive a POST request containing a checkin parameter. Inside the checkin parameter will be a normal check-in response, rendered from your user's point of view.

- Requires an HTTPS endpoint on port 443.
- Only fires for users who have authorized your application.

### Venue Push API

The Venue Push API will push to your application content from venues managed by any of your application's authorized users. Supported venue content are check-ins, likes, tips, and photos at the venue.

- In order for your app to see pushes for a venue, at least one of the venue's managers must have authorized use of your app.
- Responses are generated from an anonymous point of view, meaning that some private information, such as shouts, will not be included.
- Off-the-grid check-ins, cheat check-ins, and check-ins by users who have opted out of venue statistics collection are not sent to this API.
- Requires an HTTPS server endpoint.
