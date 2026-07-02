# Slates Specification for Addresszen

## Overview

AddressZen is an address verification and data validation platform that provides APIs for address autocomplete/search, address verification (cleansing), email validation, and phone number validation. It delivers US and international address lookup verified by trusted sources, supporting both domestic and global coverage with multiple authoritative datasets.

## Authentication

Most requests require an API key for authentication. Authenticate by passing an `api_key` as part of the query string.

For example:

```
https://api.addresszen.com/v1/autocomplete/addresses?api_key=YOUR_API_KEY&q=parkside
```

Alternatively, authentication can be transmitted via the `Authorization` header using the following scheme:

```
Authorization: api_key="YOUR_API_KEY"
```

API keys are obtained from your AddressZen account and typically begin with `ak_`. Keys can be managed through the account dashboard at `account.addresszen.com`. You can configure security settings on keys including allowed URL whitelists, daily lookup limits, and per-IP limits.

The base URL for API requests is `https://api.addresszen.com/v1/`.

## Features

### Address Autocomplete / Search

The address autocomplete API returns a list of address suggestions that match a query, ordered by relevance. This API can be used to power real-time address finders, also known as address autofill or address autocomplete.

- Address autocompletion is a two-step process: first retrieve partial address suggestions via autocomplete, then retrieve the full address using the ID provided in the suggestion.
- Results can be narrowed using filters such as restricting by postcode.
- A `limit` parameter controls how many suggestions are returned.
- A dataset filter parameter allows restricting address searches to specific datasets within a country.

### Address Verification (Cleansing)

Address verification takes a complete address and validates it against authoritative postal data, returning a standardized, deliverable address or an error if the address cannot be verified.

- Accepts a full address string as input, or an address with specific components like ZIP code, city, and state.
- Returns standardized address components (line 1, line 2, city, state, ZIP code, etc.).
- Use cases include cleaning existing address databases, validating form submissions, verifying shipping addresses before fulfillment, and CRM integration.
- Currently focused on US address verification.

### Email Validation

The API provides email address validation via a GET request to the `/emails` endpoint. This allows you to query and validate email addresses for correctness and deliverability.

### Phone Number Validation

The API provides phone number validation via a GET request to the `/phone_numbers` endpoint. This allows you to query and validate phone numbers.

### API Key Management

The API allows programmatic management of API keys, including:

- Checking key availability (public information).
- Retrieving key details such as remaining lookups, available datasets, and usage limits.
- Updating key settings.
- Retrieving usage statistics for a range of days.
- Exporting lookup logs as CSV.

### Request Tagging

Requests that affect your balance may be annotated with arbitrary metadata. This data is stored along with your lookup history and can be queried at a later date via the API or the dashboard. This feature is called tagging.

## Events

The provider does not support events. There are no webhooks or event subscription mechanisms available in the AddressZen API.
