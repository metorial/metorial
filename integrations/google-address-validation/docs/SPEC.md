# Slates Specification for Google Address Validation

## Overview

Google Address Validation is a service within the Google Maps Platform that validates, standardizes, and geocodes postal addresses. It identifies address components, validates them for correctness, and provides suggestions for corrections, unlike the Geocoding API, which only converts addresses to coordinates. The API provides international address validation coverage for a wide range of countries, with varying data quality by region.

## Authentication

The Google Address Validation API supports two authentication methods:

### API Key

API keys are used for securing Google Maps Platform products, linking usage and billing to your project. To create an API key, navigate to the Credentials page in the Google Cloud console and select "Create credentials." To call the Address Validation API you need to include an API key in the URL and use HTTPS protocol.

The API key is passed as a query parameter:

```
POST https://addressvalidation.googleapis.com/v1:validateAddress?key=YOUR_API_KEY
```

It is recommended to restrict API keys to specific APIs and IP addresses for security.

### OAuth 2.0 / Service Account

The Address Validation API requires enabled billing and an API key or OAuth token. When you use client libraries, you use Application Default Credentials (ADC) to authenticate. For information about setting up ADC, see Google's documentation on providing credentials.

For server-to-server integration, a Google Cloud service account can be used. The service account JSON key file provides credentials that are exchanged for OAuth 2.0 access tokens. The relevant OAuth scope is `https://www.googleapis.com/auth/cloud-platform`.

**Prerequisites:**

- A Google Cloud project with billing enabled
- The Address Validation API enabled on the project

## Features

### Address Validation and Standardization

The API accepts an address, identifies address components, validates them, and standardizes the address for mailing while finding the best known latitude/longitude coordinates for it.

- Accepts addresses as structured fields (region code, locality, address lines) or as a single unstructured string.
- Corrects — provides component-level validation checks including sub-premises where available. Completes — attempts to infer missing or incorrect address components. Formats — cleans up and standardizes the format for address components.
- Returns a **verdict** summarizing overall address quality, including validation granularity (e.g., PREMISE, SUB_PREMISE) and deliverability assessment.
- The addressComponent property provides a detailed listing of the elements of the address with each component identified by name, type, and confirmation level.
- The metadata property can indicate whether the address is residential, business, or a PO Box. This metadata is only available for select countries.
- Returns geocode data (latitude/longitude) and a Google Place ID for the validated address.
- The API supports returning the address in English in the response, though this is currently a preview feature.
- Residential and commercial address metadata properties are only populated for specific countries. Support is not extended to dependent territories with unique CLDR codes unless explicitly listed.

### USPS CASS™ Processing (US & Puerto Rico)

For addresses in the United States and Puerto Rico, you can enable the Coding Accuracy Support System (CASS™).

- CASS is not enabled by default. To enable CASS, set `enableUspsCass` to `true` as part of a validation request.
- When enabled, the response includes USPS-specific data such as ZIP+4 codes, delivery point codes, and carrier route information.
- USPS evaluates requests for artificially created addresses, and Google is obligated to stop validation and report relevant information to USPS in such cases.

### Validation Feedback

The ProvideValidationFeedback method allows you to send feedback about the outcome of a sequence of validation attempts. This should be the last call made after a sequence of validation calls for the same address, and should be called once the transaction is concluded.

- Feedback indicates whether the user accepted the original address, the API-corrected version, or edited the address manually.
- Helps Google improve future validation results.

## Events

The provider does not support events. Google Address Validation is a stateless request/response API with no webhook or event subscription mechanism.
