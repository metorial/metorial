Now let me fetch the Postman docs to get more details on the API endpoints:Now I have enough information. Let me compile the specification.

# Slates Specification for PostGrid Verify

## Overview

PostGrid Verify is an address verification and autocomplete API that validates, standardizes, and geocodes postal addresses. It supports US and Canadian addresses (CASS and SERP certified) as well as international addresses across 245+ countries. The API offers single address verification, batch verification, address autocomplete, and geocoding capabilities.

## Authentication

PostGrid Verify uses API key authentication. You authorize HTTP requests by setting the `x-api-key` HTTP header to your API key.

You can create an API key by accessing the Developers section of the platform, where you can click "Create new access key" and select the type of key you want. There are three types of keys:

- **Public key**: Used for front-end web applications; can only be used on specified origins.
- **Secret (server) key**: Used for server-side applications and can be used anywhere. Required for batch verification.
- **Test key**: Does not consume any lookups but only returns dummy data.

API keys are created and managed at [https://app.postgrid.com/addver/developers](https://app.postgrid.com/addver/developers).

The base URL for the standard (US/Canada) API is `https://api.postgrid.com/addver/`. A separate base URL exists for the international API at `https://intl.postgrid.com/`.

## Features

### Address Verification

Validates whether addresses are deliverable. A `verified` status means the address is deliverable as-is, `corrected` indicates it was fixed, and `failed` means it could not be fixed. Addresses can be supplied as structured components (line1, city, state, postal code) or as a freeform string. The response includes error details explaining what was fixed or why verification failed.

- **Options**: `includeDetails=true` returns additional parsed components (street name, type, direction, unit number, county, residential/vacant indicators). `properCase=true` returns addresses in proper case format.
- US addresses support ZIP+4 lookup, residential/vacant detection, and county information. Canadian addresses are SERP-certified.

### Batch Address Verification

Supports verifying addresses in batches of up to 2,000 at a time. Bulk verification can also be done by uploading a CSV file.

- Requires a secret (server) API key.

### Address Autocomplete

Provides type-ahead address suggestions as users type partial addresses. The autocomplete offers real-time, verified, and relevant type-ahead address suggestions, using the user's IP address to suggest nearby addresses.

- A preview endpoint returns suggestions without consuming lookups; a full completion endpoint consumes one lookup when the user selects an address.
- Suggestions include premise-level data such as unit numbers and PO Boxes.

### Geocoding and Reverse Geocoding

All POST endpoints provide geolocation information when `geocode=true` is provided as a query parameter. Returns latitude/longitude coordinates along with an accuracy score (0.00–1.00) and accuracy type (rooftop, point, range_interpolation, etc.).

- The reverse geocoding feature lets you convert geographic coordinates into readable addresses.
- Geocoding must be enabled by contacting PostGrid support.
- Geocoding counts as an additional lookup, so a total of two lookups per API call with geocoding enabled.

### International Address Verification

Allows you to autocomplete, verify, and standardize international addresses in real-time across 245+ countries.

- The transliteration feature allows you to convert foreign languages into understandable address formats (Roman).
- Uses a separate API endpoint from the standard US/Canada verification.

### Change of Address (NCOA)

PostGrid keeps up with the National Change of Address (NCOA) database to update address details accordingly. It helps automatically replace obsolete addresses with new records and identify when recipients move to different locations.

- Available as part of the bulk verification tool.

## Events

The PostGrid Verify API (address verification) does not support webhooks or event subscriptions. Webhooks are only available on the separate PostGrid Print & Mail API for tracking mail delivery status, which is a different product from PostGrid Verify.
