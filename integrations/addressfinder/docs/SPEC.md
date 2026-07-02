Now let me fetch the authentication overview page for more details on OAuth2:I now have comprehensive information. Let me compile the specification.

# Slates Specification for Addressfinder

## Overview

Addressfinder is an address verification and data quality service focused on Australia, New Zealand, and international addresses. It provides address autocomplete, address verification, location search, reverse geocoding, points of interest lookup, email verification, and phone verification via a REST API.

## Authentication

Addressfinder supports three authentication methods:

### 1. API Key + Secret (Server-to-Server)

Every project in the Addressfinder Portal has an API key and a secret. For server-to-server calls, pass the API key as a `key` query parameter and the secret in the `Authorization` header.

Example:

```
curl -H "Authorization: YOUR_API_SECRET" \
  "https://api.addressfinder.io/api/nz/address/autocomplete/?key=YOUR_API_KEY&q=184+will&format=json"
```

Alternatively, both `key` and `secret` can be included as query parameters directly, though this is less secure.

### 2. API Key + Registered Domain (Browser/Client-Side)

For browser-based requests, register your domain in the Addressfinder Portal. The API key alone (as a `key` query parameter) is sufficient when the request originates from a registered domain. No secret is required.

### 3. OAuth2 Client Credentials (Bearer Token)

For machine-to-machine integrations, Addressfinder supports the OAuth2 client credentials grant (RFC 6749). This feature must be enabled by contacting Addressfinder.

- **Token endpoint:** `POST https://api.addressfinder.io/oauth/token`
- **Required parameters:** `grant_type=client_credentials`, `client_id`, `client_secret`
- **Optional parameters:**
  - `scope` — space-separated list of scopes: `address`, `phone`, `email`. Defaults to all scopes permitted by the client.
  - `expires_in` — token lifetime in seconds (default: 900, max: 3600).
- The returned JWT Bearer token is passed in the `Authorization: Bearer <token>` header. No `key` or `secret` parameters are needed when using a Bearer token.
- **JWKS endpoint** for independent token verification: `GET https://api.addressfinder.io/.well-known/jwks.json`

OAuth2 credentials (Client ID and Client Secret) are created in the Addressfinder Portal under a project's Credentials page. The Client Secret is only shown once at creation time.

## Features

### Address Autocomplete

Interactive type-ahead search that returns closely matching addresses as the user types. Available for Australian, New Zealand, and international addresses. Supports configurable parameters such as filtering by state/region and response format.

### Address Metadata Retrieval

Fetches the full metadata (e.g., structured components, geocoordinates, identifiers) associated with an address selected from the autocomplete results. Works in tandem with the Address Autocomplete feature.

### Address Verification

Accepts a full address (potentially with errors or typos) and attempts to match it against a verified record in the Addressfinder database. Returns the matched, standardized address along with metadata. Available for Australian and New Zealand addresses.

### Location Autocomplete and Metadata

Interactive search for locations such as streets, suburbs, and states (AU and NZ). Returns matching locations which can then be selected to retrieve full location metadata.

### Reverse Geocoding

Takes GPS coordinates (longitude and latitude) and returns the nearest addresses ordered by distance. Available for New Zealand only.

### Points of Interest Search

Interactive search for points of interest and their associated addresses (NZ only). Supports autocomplete and full metadata retrieval for selected results.

### Email Verification

Validates an email address by checking syntax, domain existence and availability, and email account existence. Returns a verified state and associated metadata.

### Phone Verification

Verifies a phone number through syntax and range checks followed by a network-level connection status check. Returns the verified number, line type, connection status, and other metadata.

### Bulk Verification

Allows verification of address data in bulk, suitable for cleaning up existing address databases rather than one-off lookups.

## Events

The provider does not support events.
