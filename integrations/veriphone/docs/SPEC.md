# Slates Specification for Veriphone

## Overview

Veriphone is a phone number validation and carrier lookup service. It provides a REST API to verify, format, and retrieve metadata (country, carrier, line type, region) for phone numbers across all countries worldwide.

## Authentication

Veriphone uses API keys to authenticate requests. You can view and manage your API key in your control panel.

To use the Veriphone API, developers must sign up for an API key on the Veriphone website at https://veriphone.io. To obtain your API key, navigate to the control panel, click on the account section, and copy the API key displayed on the screen.

The API key is passed as a query parameter named `key` on each request. For example:

```
https://api.veriphone.io/v2/verify?phone=+14152007986&key=YOUR_API_KEY
```

API requests without a valid API key will fail.

Requests carrying your API key will deduct 1 credit from your balance, so be sure to keep your key secure. Do not share it in publicly accessible areas such as GitHub or client-side code.

## Features

### Phone Number Validation

The verify feature takes a phone number and an optional default country as input, and tells you if the number is valid. For valid numbers, it also returns the number's type (mobile, land line, toll free, etc.), the carrier, and other fields.

- **Parameters:** Phone number (required), default country code (optional).
- If the number does not start with a country prefix indicated by a leading '+', the number will be checked against the default country's numbering scheme. If no default country is provided, a country will be inferred from the IP address originating the request.
- Response includes: validity status, phone type, region, country, country code, country prefix, international and local formatted numbers, E.164 format, and carrier.

### Example Phone Number Generation

The example feature returns a dummy phone number for any country and phone type combination. The country and phone type are optional. If no country is specified, a country will be inferred from the IP address originating the request. If no phone type is specified, 'mobile' will be used as default type.

- **Parameters:** Country code (optional), phone type (optional, e.g., `mobile`, `fixed_line`).
- Useful for testing and development purposes.

### Bulk Validation

Bulk validation is available: upload your CSV, validate, and download. This is provided via the web interface rather than the API.

### Data Enrichment

Veriphone provides extra parameters for segmenting any lead or customer database, including country, region, carrier, and line type.

## Events

The provider does not support events. Veriphone is a stateless validation API with no webhook or event subscription capabilities.
