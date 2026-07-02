Now let me get more details on the API parameters and features, especially annotations and geosearch.Now let me get more details on the annotations and optional parameters:I now have enough information to write the specification.

# Slates Specification for Opencage

## Overview

OpenCage provides worldwide geocoding based on open data via a REST API. It offers two main services: forward geocoding (place name to longitude and latitude) and reverse geocoding (longitude and latitude to the name and address of the location). OpenCage also operates a separate geosearch/autosuggest service, which is distinct from the geocoding API.

## Authentication

Using the OpenCage geocoding API requires a valid API key that you must pass with each HTTP request as the value of the `key` parameter — one of two required parameters. It is NOT necessary to set any HTTP headers for authentication.

The API key is a 30-character alphanumeric string. After you have registered, you can generate an API key with the OpenCage dashboard.

Example request:

```
GET https://api.opencagedata.com/geocode/v1/json?key=YOUR-API-KEY&q=Berlin
```

Free trial and one-time plan accounts are limited to one active key at a time; subscription customers can have multiple keys. Subscription customers can add IP address restriction to their API keys.

Geosearch uses a separate key (prefixed with `oc_gs_...`) that must be configured for a specific domain in the OpenCage account dashboard. This key is unrelated to the geocoding API key.

## Features

### Forward Geocoding

Convert addresses or place names into geographic coordinates (latitude/longitude). Results can be narrowed using the `bounds` and/or `countrycode` parameters.

- **`countrycode`**: Restricts results to a specific country or set of countries using a comma-separated list of ISO 3166-1 Alpha 2 codes (e.g., `countrycode=fr,be,lu`).
- **`bounds`**: Limits results to a specific bounding box defined as `min_lon,min_lat,max_lon,max_lat`.
- **`proximity`**: Provides a hint to bias results in favour of those closer to the specified location.
- **`language`**: Results can be returned in a specific language using an IETF BCP 47 language tag (e.g., `"tr"` for Turkish or `"pt-BR"` for Brazilian Portuguese). The `"native"` tag attempts to return results in the official language(s) of the location.
- **`limit`**: Upper limit for the number of results returned. Default is 10, maximum is 100.
- **`min_confidence`**: An integer value between 0 and 10 indicating the minimum precision of results based on the extent of the result's bounding box.
- **`no_dedupe`**: Disables deduplication of results.
- **`abbrv`**: Requests abbreviated results (shorter formatted addresses).
- **`address_only`**: Returns only the address portion of results.

### Reverse Geocoding

Reverse geocoding works in the opposite direction: from a pair of coordinates to the name and address most appropriate for the coordinates. Accepts the same optional parameters as forward geocoding (language, limit, etc.).

- Coordinates must use the WGS 84 (EPSG:4326) coordinate reference system in decimal format.

### Data Annotations

OpenCage supplies additional information about result locations in annotations, which include country information, time of sunset and sunrise, UN M49 codes, and the location in different geocoding formats like Maidenhead, Mercator projection (EPSG:3857), geohash, or what3words.

Based on the Go SDK structure, annotations can include:

- **Timezone**: Name, offset, and short name of the timezone.
- **Currency**: Local currency details (name, code, symbol).
- **Calling code**: International dialing code.
- **Sun**: Sunrise and sunset times.
- **Road info**: Speed limits, road type, and driving side information.
- **Geohash, MGRS, Maidenhead, Mercator**: Alternative coordinate formats.
- **NUTS codes, FIPS codes, UN/LOCODE**: Regional classification codes.
- **what3words**: The what3words address.
- **OSM**: OpenStreetMap URL and edit link.
- **Qibla**: Direction to Mecca.
- **Flag**: Country flag emoji.

Some annotations are resource intensive and are only available to paying customers. Some annotations (e.g., currency) depend on the coordinates being in a country and will not be supplied for results outside country boundaries.

Annotations can be disabled with the `no_annotations` parameter to reduce response size.

### Confidence Scoring

The precision of a match is returned in the `confidence` field as an integer value between 0 and 10, where 0 means confidence cannot be determined, 1 indicates low precision, and 10 indicates high precision. Confidence is not used for ranking results.

### Road Information

The `roadinfo` parameter indicates whether the geocoder should attempt to match the nearest road rather than an address, and provide additional road and driving information.

### Privacy Controls

The optional `no_record` parameter prevents OpenCage from keeping any record of the query content. OpenCage still records that a request was made, but not the specifics.

### Geosearch / Autosuggest

Geosearch is a separate service from geocoding. Geocoding turns an address or place name into coordinates, while geosearch turns a few characters into a place name suggestion. It provides a type-ahead/autocomplete experience for location search in client-side applications.

- Can be restricted by country code or bounding box.
- Results appear in English by default, but can be changed to German, French, Italian, Portuguese, or Spanish.
- Covers countries, states, regions, cities, towns, villages, neighbourhoods, and major POIs, but does not have exhaustive coverage of all commercial establishments.
- Does not support searching for specific house addresses, postcodes, or roads.
- Uses a separate API key (prefixed `oc_gs_...`) configured for a specific domain.

### Batch/File Geocoding

OpenCage supports uploading spreadsheets or CSV files for batch geocoding. Users can configure which data fields to append to results (coordinates, city, state, type, etc.).

### Output Formats

The API supports multiple response formats including JSON, GeoJSON, and XML. A Google v3-compatible JSON format is also available, making migration from Google's geocoding service easier.

## Events

The provider does not support events. OpenCage is a request-response geocoding API with no webhook or event subscription functionality.
