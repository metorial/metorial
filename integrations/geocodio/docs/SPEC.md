Let me check the API docs for more details on authentication and the data append fields.# Slates Specification for Geocodio

## Overview

Geocodio is a geocoding and data enrichment service for US, Canadian, and Mexican addresses. It converts addresses to coordinates (and vice versa), parses/standardizes addresses, calculates distances, and appends additional data such as Census demographics, Congressional districts, timezones, school districts, and more.

## Authentication

Geocodio uses **API key** authentication. API keys are created and managed via the [Geocodio dashboard](https://dash.geocod.io).

The API key can be provided in one of two ways:

1. **Query parameter:** Append `api_key=YOUR_API_KEY` to any request URL.
   - Example: `https://api.geocod.io/v1.11/geocode?q=1109+N+Highland+St&api_key=YOUR_API_KEY`

2. **Authorization header:** Pass the key as a Bearer token.
   - Example: `Authorization: Bearer YOUR_API_KEY`

Accounts can have multiple API keys. Each key has configurable permissions that control access to specific API features:

- By default, API keys only have access to single and batch geocoding endpoints (write-only).
- Access to the **Lists API** (spreadsheet geocoding) and **Distance API** must be explicitly enabled per key in the dashboard.
- It is recommended to create separate API keys for geocoding vs. list/distance access for security purposes.

No OAuth or other authentication mechanisms are supported.

## Features

### Forward Geocoding

Converts street addresses, cities, ZIP codes, or intersections into latitude/longitude coordinates. Supports US, Canadian, and Mexican addresses. Addresses can be provided as a single string or as individual components (street, city, state, postal code, country). Returns parsed/standardized address components, accuracy scores, and source information.

- Supports single lookups and batch processing of up to 10,000 addresses at once.
- An optional `country` parameter can force lookup in a specific country (USA or Canada).
- A `limit` parameter controls maximum results returned. A `format=simple` option returns a streamlined response.

### Reverse Geocoding

Converts latitude/longitude coordinates into street addresses. Returns the closest matching addresses ranked by accuracy.

- Supports single and batch reverse geocoding (up to 10,000 coordinates).
- A `skipGeocoding` parameter allows extracting only field append data from coordinates without performing address lookup (only field appends are billed).

### Spreadsheet/List Geocoding

Allows uploading CSV, TSV, or Excel files for asynchronous batch geocoding of large datasets (up to 10M+ rows). Files are processed in the background, and results can be downloaded when complete.

- Supports both forward and reverse geocoding of spreadsheets.
- A flexible template syntax maps spreadsheet columns to address components.
- An optional `callback` URL receives a webhook notification when processing completes.
- Processed data is automatically deleted after 72 hours.

### Data Enrichment (Field Appends)

Appends additional metadata to geocoded addresses or coordinates by specifying a `fields` parameter. Multiple fields can be requested simultaneously. Available data appends include:

- **US Electoral:** Congressional districts (with legislator contact info), state legislative districts (with legislator info).
- **US Census:** Block/Tract/FIPS codes, MSA/CSA codes, with vintage data back to 2000.
- **US Census ACS:** Demographics (age, sex, race/ethnicity), economics (household income), families/households, housing, and social data (education, veteran status). Available at multiple geographic levels (block group, tract, place, county, state, MSA).
- **USPS:** ZIP+4 codes, residential delivery indicator, carrier route.
- **US Other:** School districts, FFIEC fair lending data, OCD identifiers.
- **Canadian:** Federal and provincial/territorial electoral ridings, Statistics Canada geographies (divisions, subdivisions, dissemination areas/blocks, population centres, etc.).
- **General:** Timezone (name, UTC offset, DST observance).

Data appends are only available for specific countries (most are US-only; some are Canada-only; timezone is universal).

### Distance Calculations

Calculates driving distance/time and straight-line (haversine) distance between locations. Accepts both addresses and coordinates as input.

- **Single origin:** One origin to up to 100 destinations (synchronous).
- **Distance matrix:** Multiple origins to multiple destinations, up to 10,000 calculations (synchronous).
- **Distance jobs:** Asynchronous processing for up to 50,000 calculations, with results downloadable when complete.
- Results can be filtered by maximum/minimum distance or duration, sorted, and limited.
- Distance calculations can also be embedded directly into geocoding requests via the `destinations[]` parameter.

### Address Parsing and Standardization

Geocodio automatically parses, standardizes, and completes addresses. It corrects spelling errors, expands abbreviations, and fills in missing components (e.g., adding city/state from a ZIP code). Supports unit-level geocoding for apartments/suites when data is available.

### Stable Address Keys

Every geocoding result includes a `stable_address_key` — a deterministic, persistent identifier for the geocoded address. These keys can be used for deduplication, re-fetching updated results, and requesting field appends on previously geocoded addresses without being charged for geocoding again.

### Google Maps Compatibility

A compatibility endpoint (`/maps/api/geocode/json`) allows migrating from Google Maps with minimal code changes. Existing Google Maps SDKs can be pointed to Geocodio by changing the base URL and API key. US and Canada addresses only.

## Events

The Lists API supports an optional **webhook callback** for list processing completion. When creating a new list geocoding job, a `callback` URL can be specified. Upon completion of the spreadsheet processing, Geocodio sends a `POST` request to the callback URL with job metadata including the list ID, fields, filename, geocoded row count, and download URL.

- The callback URL must be publicly accessible and served over HTTPS with a valid SSL certificate.
- Up to 3 delivery attempts are made.

Distance matrix jobs also support a `callback_url` parameter that works the same way — a webhook `POST` is sent when the asynchronous distance job completes.

No other event/webhook mechanisms are available.
