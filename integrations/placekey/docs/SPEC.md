# Placekey Integration Specification

## Overview

Placekey is a service that provides universal, unique identifiers for physical places worldwide. It helps with entity matching for places and addresses, enabling users to deduplicate, match, sync, and merge physical places. The API can retrieve a Placekey for any location in the world, identifying it by its geographical coordinates or its address.

## Authentication

Authentication to the API is done via API Keys, which can be generated from the account dashboard. All you have to do to be authenticated is to set the `apikey` header on your request to your API key.

- **Base URL**: `https://api.placekey.io`
- **Header**: `apikey: <your_api_key>`
- **Content-Type**: `application/json`

You can create your API key by logging into your self-service dashboard.

Example request header:

```
apikey: your_api_key_here
Content-Type: application/json
```

## Features

### Placekey Lookup

Retrieve a unique Placekey identifier for a single location. Places can be specified using latitude, longitude, location_name, street_address, city, region, postal_code, iso_country_code, and place_metadata. Coordinates alone return only the geographic Where part. An address and location name are needed to match a specific POI.

Each query must include both coordinates, or a street address, region, country code, and either city or postal code. Invalid input combinations are rejected before a request is sent. An optional `queryId` is echoed in the response.

- **Place metadata** can include optional disambiguation hints like `store_id`, `phone_number`, `website`, `naics_code`, and `mcc_code`.
- The more input parameters provided, the more precise the match.

### Bulk Placekey Lookup

For large numbers of places to match, you can send batches of 1–100 queries. Supplied `iso_country_code` values must agree; coordinate-only queries may omit the country code. Custom `query_id` values can be specified per query to correlate results. Custom IDs must be unique within a batch, and generated IDs avoid collisions with them.

### Optional Response Fields

In addition to getting a Placekey and a query_id, you can request additional fields within the `fields` parameter of the request. Available optional fields include:

- **address_placekey**: A subcomponent of a Placekey that has the `location_name` not included in the request.
- **building_placekey**: A subcomponent of the address_placekey representing the query without the suite or apartment number.
- **confidence_score**: The current API returns `HIGH`, `MEDIUM`, or `LOW`, exposed as `confidenceLevel`. The optional numeric `confidenceScore` output remains available for numeric responses for compatibility.
- **normalized_address**: A structured and parsed representation of an address, ensuring consistency across datasets.
- **geocode**: Converts an address or place description into precise geographic coordinates (latitude and longitude).
- **upi**: Universal Parcel Identifier developed by RESO, a standard for a single identifier that includes both parcel numbers and the geographies of the authorities that created them.
- **parcel**: A unique identifier assigned to a specific piece of land by a local government or tax authority.
- **geoid**: Geographic identifier for census areas.
- **gers**: Global Entity Reference System identifier, omitted from output when the API returns null.

Query-level match failures return an `error` and an empty `placekey` string, allowing batch results to retain their individual query IDs. HTTP failures and malformed responses raise a structured service error.

### Geocoding

Geocoding is the process of converting addresses into geographic coordinates, which you can use to place markers on a map or position the map. Request it through `fields: ["geocode"]`. The returned object contains `location.lat`, `location.lng`, and `location_type`. Each geocode consumes an additional lookup on top of the Placekey lookup.

### Join Data Product

The Placekey Joined Data Product is a solution designed to simplify the process of merging disparate datasets. It allows you to upload your own data or explore pre-Placekeyed datasets and easily append Placekeys to generate actionable insights. Pre-Placekeyed datasets include OpenAddresses, Overture Maps, and NPI.

- This is a dashboard-based product, not a direct API feature.
- Supports CSV, JSON, and Excel formats.

## Events

The provider does not support events. Placekey is a lookup/matching service with no webhooks, event subscriptions, or purpose-built polling mechanisms.
