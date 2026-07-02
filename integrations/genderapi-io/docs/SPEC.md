# Slates Specification for GenderAPI.io

## Overview

GenderAPI is a service that determines a person's gender based on their first name, full name, email address, or social media username. It also provides a phone number validation and formatting API. It supports names in many languages including Chinese, Hindi, Arabic, and other non-Latin scripts.

## Authentication

GenderAPI uses **API Key** authentication. An API key is obtained by registering an account at `app.genderapi.io`. The API key can be provided in two ways:

1. **Bearer Token in Authorization Header** (recommended): Pass the API key in the `Authorization` header as `Bearer YOUR_API_KEY`. For example:

   ```
   Authorization: Bearer YOUR_API_KEY
   ```

2. **API Key in request body or query parameter**: Include the key as a `key` parameter in the JSON POST body or as a query parameter in GET requests. For example:
   ```
   https://api.genderapi.io/api?name=Alice&key=YOUR_API_KEY
   ```

Both methods are supported on all endpoints. No OAuth or additional scopes are required.

## Features

### Gender Detection from Name

Predict the gender of a person given a first name or full name. Returns a gender prediction (`male`, `female`, or `null`) along with a probability score and the most likely country of origin.

- **country**: Optional two-letter ISO 3166-1 alpha-2 country code to improve prediction accuracy for region-specific names (e.g., "Andrea" is male in Italy but female elsewhere).
- **askToAI**: When enabled, uses AI models to determine gender if the name is not found in the database.
- **forceToGenderize**: When enabled, attempts a gender prediction even for non-standard inputs like nicknames or fantasy names. Results may be less accurate.
- Supports both single and bulk requests.

### Gender Detection from Email Address

Extract a name from an email address and predict the gender of the person. The API automatically parses common email patterns (e.g., `firstname.lastname@domain.com`) to identify the name.

- **country**: Optional country code for improved accuracy.
- **askToAI**: Optional AI fallback when the extracted name is not in the database.
- The API analyzes personal identifiers in the email address such as first or full names. Generic or role-based emails like support@, info@, or sales@ cannot be used for accurate gender determination.
- Supports both single and bulk requests.

### Gender Detection from Username

Predict gender from social media usernames or display names. Social media usernames often contain real names or name patterns that can be extracted and analyzed using AI. The algorithm automatically identifies potential names in handles like @johnsmith or @emilyrose.

- **country**: Optional country code for improved accuracy.
- **askToAI**: Optional AI fallback.
- **forceToGenderize**: Useful for usernames containing non-name words or fantasy terms.
- Supports both single and bulk requests.

### Phone Number Validation & Formatting

Validate and format phone numbers from 242 countries. Accepts numbers in various formats and normalizes them to E.164 format.

- Returns validation status (`isValid`, `isPossible`), number type (mobile, landline, VoIP, etc.), geographic location, area code, and country metadata.
- **address**: Optional parameter to help parse numbers without an international dialing code. Accepts ISO country codes, country names, or city names. Becomes required if the number lacks a `+` prefix with country code.

### Usage & Quota Monitoring

Check remaining API credits, usage statistics, and account expiration details.

## Events

The provider does not support events.
