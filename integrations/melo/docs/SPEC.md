Now I can see that Melo (formerly notif.immo) is a French real estate data API. Let me get more details from their official documentation.Now let me get details on the webhook events and the search creation endpoint for more details on events.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Melo

## Overview

Melo (formerly notif.immo) is a French real estate data API that aggregates and deduplicates property listings from over 900 sources across France in real time. It provides access to property adverts, market analytics (such as price per meter evolution and similar properties), and saved search functionality with webhook-based notifications.

## Authentication

Melo uses **API key** authentication. All API requests require the `X-API-KEY` header.

- **Obtaining a key**: Sign up at [melo.io](https://www.melo.io) and create an API key in your account settings.
- **Header**: `X-API-KEY: <your_api_key>`
- **Environments**: Melo provides two environments, each with a different base URL:
  - **Production**: `https://api.notif.immo`
  - **Sandbox**: `https://preprod-api.notif.immo` (static/limited data for testing; broader queries recommended)

Example request:

```
curl --request GET 'https://api.notif.immo/documents/properties/{id}' \
  --header 'Content-Type: application/json' \
  --header 'X-API-KEY: <api_key>'
```

## Features

### Property Search & Retrieval

Query and retrieve real estate property listings from across France. Properties are deduplicated across 900+ sources and include details such as price, surface area, location (with geolocation), photos, energy ratings, contact information, nearby transit stations, and more.

- Filter by transaction type (sale or rent), property type (apartment, house, building, parking, office, land, shop), budget range, surface area, number of rooms/bedrooms, location (city, department, zipcode, or lat/lon with radius), price per meter, publisher type (individual or professional), furnished status, virtual tour availability, and full-text keyword expressions.
- Retrieve individual property details by ID.

### Similar Properties

Find properties similar to a given property, useful for market comparison and valuation.

### Saved Searches

Create, update, delete, and list persistent search queries with specific criteria. Saved searches enable real-time monitoring — when new properties matching the criteria appear, notifications can be triggered via webhook or email.

- Searches support all the same filters as property search (location, budget, property type, surface, etc.).
- Can include or exclude specific cities, departments, zipcodes, and source site categories.
- Supports full-text expressions to include or exclude keywords in property titles/descriptions.

### Market Indicators

Access market analytics and location data for France:

- **Cities**: Retrieve a list of cities with active listings.
- **Price per Meter Evolution**: Track price-per-meter trends over time for a given area.
- **Points of Interest**: Get nearby points of interest for a location.
- **Location Autocomplete**: Search and autocomplete location names, filterable by country and location type.

## Events

Melo supports webhooks tied to saved searches. When creating or updating a search, you can configure two types of webhook endpoints:

- **`endpointRecipient`**: Receives new property matches in real time (when a new property matches the saved search criteria).
- **`eventEndpoint`**: Receives advert-level events for properties that match the search. You must also specify which events to subscribe to via the `subscribedEvents` parameter.

Notifications must be enabled by setting `notificationEnabled` to `true` on the search.

### Match Events

- **New Match**: When a new property matching the saved search criteria is found, the full property document (including adverts, location, price, etc.) is sent to the `endpointRecipient` webhook.

### Advert Events

Subscribe to specific advert-level changes via `subscribedEvents`, delivered to the `eventEndpoint`:

- **`property.ad.create`**: A new advert is created for a property matching the search.
- **`property.ad.update`**: An existing advert is updated.
- **`ad.update.price`**: The price of an advert changes. Includes old value, new value, and percent variation.
- **`ad.update.surface`**: The surface area of an advert changes.
- **`ad.update.pictures`**: The pictures of an advert are updated.
- **`ad.update.expired`**: An advert has expired.

Failed webhook deliveries are retried up to 5 times, with 1-hour intervals between retries. Your endpoint must return a `200` HTTP status code to acknowledge receipt. Melo also provides a webhook simulation endpoint for testing.
