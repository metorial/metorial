# Slates Specification for Placekey

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

Retrieve a unique Placekey identifier for a single location. Places can be specified using latitude, longitude, location_name, street_address, city, region, postal_code, iso_country_code, and place_metadata. If you only have a pair of coordinates you can still get a Placekey, though it will only contain the "where" part. If you provide the name of the place, the Placekey will contain a unique identifier for the POI located there.

- **Place metadata** can include optional disambiguation hints like `store_id`, `phone_number`, `website`, `naics_code`, and `mcc_code`.
- The more input parameters provided, the more precise the match.

### Bulk Placekey Lookup

For large numbers of places to match, you can send batches. All queries in a batch must have the same `iso_country_code`. Custom `query_id` values can be specified per query to correlate results.

### Optional Response Fields

In addition to getting a Placekey and a query_id, you can request additional fields within the `fields` parameter of the request. Available optional fields include:

- **address_placekey**: A subcomponent of a Placekey that has the `location_name` not included in the request.
- **building_placekey**: A subcomponent of the address_placekey representing the query without the suite or apartment number.
- **confidence_score**: Reflects the level of confidence in the accuracy of the assigned Placekey, influenced by quality of input data, precision of coordinates, and comprehensiveness of reference data.
- **normalized_address**: A structured and parsed representation of an address, ensuring consistency across datasets.
- **geocode**: Converts an address or place description into precise geographic coordinates (latitude and longitude).
- **upi**: Universal Parcel Identifier developed by RESO, a standard for a single identifier that includes both parcel numbers and the geographies of the authorities that created them.
- **parcel**: A unique identifier assigned to a specific piece of land by a local government or tax authority.
- **geoid**: Geographic identifier for census areas.
- **gers**: Global Entity Reference System identifier.

### Geocoding

Geocoding is the process of converting addresses into geographic coordinates (latitude and longitude), which you can use to place markers on a map or position the map. You can request geocodes from the Placekey API the same way you request optional responses. The geocoder status indicates the precision and method used to determine the location, returned in the `location_type` field.

### Join Data Product

The Placekey Joined Data Product is a solution designed to simplify the process of merging disparate datasets. It allows you to upload your own data or explore pre-Placekeyed datasets and easily append Placekeys to generate actionable insights. Pre-Placekeyed datasets include OpenAddresses, Overture Maps, and NPI.

- This is a dashboard-based product, not a direct API feature.
- Supports CSV, JSON, and Excel formats.

## Events

The provider does not support events. Placekey is a lookup/matching service with no webhooks, event subscriptions, or purpose-built polling mechanisms.
