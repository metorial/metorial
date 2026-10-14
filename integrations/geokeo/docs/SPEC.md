# Geokeo Specification

## Overview

Geokeo is a geocoding API service that converts addresses into geographic coordinates (forward geocoding) and coordinates into addresses (reverse geocoding). It is built from open source data from sources like OpenStreetMap, GeoNames, and Natural Earth, with geocoding engine features from Nominatim and Pelias. It includes spell check features which improve results and correct errors.

## Authentication

Geokeo uses **API key** authentication. The API key is available through the dashboard under the API tab after logging in. You obtain an API key by signing up at [geokeo.com](https://geokeo.com).

The API key is passed as a query parameter named `api` on every request. For example:

```
https://geokeo.com/geocode/v1/search.php?q=empire+state+building&api=YOUR_API_KEY
```

IP restrictions can be set through the dashboard (API → Settings), allowing requests from only one IP address to restrict unwanted usage. HTTP referrer restrictions can also be configured to limit usage to a single domain.

## Features

### Forward Geocoding

Converts a text address or place name into geographic coordinates (latitude and longitude) along with a formatted postal address.

- The query parameter (`q`) accepts a search string with a 50-character limit.
- An optional `country` parameter accepts ISO 3166-1 alpha-2 country codes to restrict results to a specific country.
- The integration requests JSON results.
- Results include latitude/longitude of the centroid in WGS 84 format.
- Results also include bounding box coordinates for the matched place.

### Reverse Geocoding

Converts geographic coordinates (latitude and longitude) into a human-readable address.

- Requires `lat` (latitude) and `lng` (longitude) parameters — e.g., lat=40.74842 and lng=-73.9856.
- Results include the distance from the queried coordinates to the returned place, measured in kilometers.
- The integration requests JSON results.

## Response handling

The `forward_geocode` and `reverse_geocode` tools preserve the provider's response status and return an empty results array for `ZERO_RESULTS`. Invalid requests, access restrictions, exceeded quotas, HTTP failures, and malformed responses produce errors with remediation guidance. Success status is accepted as either `ok` or `OK`, matching the documentation's examples and response-code table.

Missing address divisions are represented by empty strings in the existing address fields. Coordinate and bounding-box strings retain the provider values. Reverse geocoding preserves the provider's distance string, including its `km` suffix when present.

The public API documentation exposes forward and reverse geocoding only. No account identity or additional geocoding endpoint is documented.

## Events

The provider does not support events.
