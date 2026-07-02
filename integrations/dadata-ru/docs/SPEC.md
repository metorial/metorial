# Slates Specification for DaData.ru

## Overview

DaData.ru is a Russian SaaS platform for standardization, validation, enrichment, and autocomplete of contact and business data. It specializes in the normalization and enrichment of contact data, including postal addresses, phone numbers, and customer names. It leverages national databases like KLADR and FIAS to ensure customer information is accurate, deduplicated, and thoroughly validated.

## Authentication

DaData.ru uses API keys for authentication. Two credentials are required:

- **API Key**: Used for all API requests. Passed in the `Authorization` header as `Token <API_KEY>`.
- **Secret Key**: Required for certain API methods (specifically the Cleaner/Standardization API and Profile API). Passed in the `X-Secret` header.

The secret key is automatically generated along with the API key, and it's available in the Account page at `https://dadata.ru/profile/`.

The API uses three base URLs depending on the type of operation:

- `https://suggestions.dadata.ru` — for suggestions/autocomplete API
- `https://cleaner.dadata.ru` — for standardization/cleaning API (requires both API Key and Secret Key)
- `https://dadata.ru/api/v2/` — for profile operations (balance, stats, versions)

**Header examples:**

- Suggestions API: `Authorization: Token <API_KEY>`
- Cleaner API: `Authorization: Token <API_KEY>` and `X-Secret: <SECRET_KEY>`

## Features

### Data Standardization (Cleaning)

Corrects errors, normalizes formatting, and enriches data from raw input strings. Supports cleaning of addresses, phone numbers, passport numbers, personal names, emails, birthdates, and vehicle identifiers. Returns structured, standardized fields along with quality codes indicating confidence. Requires both API Key and Secret Key. Primarily for Russian data.

### Address Suggestions and Autocomplete

Helps users quickly enter a correct address on a web form or in an application. Provides type-ahead suggestions as the user types. Results can be constrained by region (using KLADR/FIAS codes), by geographic coordinates and radius, or boosted for specific cities. Supports Russian and English language output. Suggestions can be bounded to specific granularity levels: region, area, city, settlement, street, or house.

### Geocoding and Reverse Geocoding

Determines coordinates from an address string, and also returns postal code and all other address data. Returns all information about an address by coordinates (reverse geocoding).

### IP-based Geolocation

Detects the user's address/location by IP address. If no IP is provided, it can attempt detection from the `X-Forwarded-For` header.

### Company and Organization Lookup

Finds a company or individual entrepreneur by INN, KPP, or OGRN, and returns company details, founders, executives, tax office information, pension fund, social insurance, financials, licenses, SME registry data, and more. Supports autocomplete suggestions for organizations. Finds organizations by the INN of their founders and executives, for both individuals and legal entities. Also supports finding affiliated companies by INN.

### Company Identification by Email

Extracts details about the organization that owns a corporate email address. Returns company name, INN, and other details based on the email domain.

### Bank Lookup

Finds a bank by BIK, SWIFT, INN, INN+KPP (for branches), or Bank of Russia registration number. Returns bank details, correspondent account, address, and status (active or in liquidation).

### Reference Directory Search (Outward API)

Provides search and lookup across various Russian government and reference directories, including:

- Federal Tax Service (FNS) units
- Federal Migration Service (FMS) units
- Postal offices
- Metro stations
- Countries
- OKVED (economic activity codes)
- Delivery service city identifiers

Requires only the API Key (no Secret Key needed).

### Company Directories for Belarus and Kazakhstan

Provides a directory of organizations and individual entrepreneurs for Belarus and Kazakhstan.

### Data Anonymization

Anonymizes customer databases for use in testing, analytics, and machine learning models by replacing real personal data with realistic but fake data.

### Account Management

Allows retrieving the current account balance, daily usage statistics, and data freshness versions for all reference directories used by the service.

## Events

The provider does not support events. DaData.ru is a stateless data enrichment and standardization service with no webhook or event subscription mechanism.
