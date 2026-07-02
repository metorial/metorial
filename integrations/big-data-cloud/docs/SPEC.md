# Slates Specification for BigDataCloud

## Overview

BigDataCloud is a data services provider offering APIs for IP geolocation, reverse geocoding, phone and email verification, and network engineering intelligence. All APIs are bundled into five packages: IP Geolocation, Reverse Geocoding, Phone & Email Verification, Network Engineering, and a Free API Package (which doesn't require account creation or an API key). Both REST and GraphQL interfaces are supported.

## Authentication

BigDataCloud uses **API key** authentication for its premium (non-free) endpoints.

- To access BigDataCloud's premium API services, simply create an account and obtain your API key. Click the "Sign Up" button at the top-right corner of the website and follow the registration process.
- No credit card or sensitive information is required to join.
- You can access any and all BigDataCloud APIs with a free API Key. To get your API Key, access your account and retrieve it from your Account Dashboard.
- The API key is passed as a query parameter named `key` in each request. For example: `https://api-bdc.net/data/reverse-geocode?latitude=-34.93&longitude=138.59&key=[YOUR API KEY]`
- After registration, you'll receive a unique API key. Allow up to 10 minutes for your key to propagate across the API server network.
- **Free (client-side) endpoints** do not require an API key or account. The free client-side endpoint does not require an API key and is designed to work directly in the browser or device application.

**Base URLs:**

- `https://api.bigdatacloud.net/` (legacy)
- `https://api-bdc.net/` (primary)

## Features

### IP Geolocation

Determine the geographic location of an IP address (IPv4 or IPv6), including country, region, city, coordinates, and timezone data. This package offers precision IP geolocation, ISP/ASN intelligence, network type classification, confidence polygons, hazard/proxy detection, mobile differentiation and more.

- **Parameters:** IP address (if omitted, the caller's IP is used), preferred locality language (ISO 639-1).
- Responses include confidence levels (`low`, `moderate`, `high`) and a polygonal confidence area.
- Provides timezone, currency, flags, country phone number code and other localised metrics for an IP address, with detailed locality information in 147 common world languages.

### IP Hazard Report & User Risk Assessment

Assess the security risk associated with an IP address. The Hazard Report API provides a consolidated, machine-readable assessment of IP address risk, combining reactive signals (evidence of past malicious behaviour such as blacklist appearances and known anonymiser detections) with proactive indicators.

- Key outputs include hostingLikelihood (0–10), AS/provider context, anonymiser indicators, and related hazard flags.
- Detects VPNs, proxies, Tor exit nodes, hosting networks, iCloud Private Relay, and bogon addresses.
- The User Risk API provides a simplified version, categorising risk level as low, moderate, or high.

### Reverse Geocoding

Convert latitude/longitude coordinates into structured locality data (country, state/region, city, postcode). The administrative/non-administrative boundaries-based reverse geocoder provides accurate location data with full global coverage, including seas and oceans, and postal code level accuracy for select countries.

- **Parameters:** Latitude, longitude, preferred locality language.
- Supports locality names in 147 languages and FIPS codes for US geographic areas.
- Also provides detailed timezone information based on geocoordinates.
- A free client-side variant exists that falls back to IP-based geolocation when coordinates are unavailable.

### Phone Number Validation

Validate and format international phone numbers. BigDataCloud's Phone Number Validation API offers worldwide international and national phone number validation based on the E.164 numbering plan. It helps businesses maintain an accurate and clean customer database.

- **Parameters:** Phone number, country code (ISO 3166-1), locality language.
- Detects line type, including FIXED_LINE, MOBILE, TOLL_FREE, PREMIUM_RATE, VOIP, PAGER, and others.
- Also supports IP-based country detection for phone validation (no explicit country code required).

### Email Address Verification

Validate email addresses for format compliance and deliverability. The API conducts full compliance verification against multiple standards including RFC 822, RFC 2822, and RFC 5321, ensuring accurate and reliable email validation results.

- Avoids the use of illegal tactics, such as the broken SMTP handshake, during validation.
- Identifies invalid, fake, or disposable/spam email addresses.

### Network Engineering

Access detailed internet infrastructure metadata. Provides the most complete and actively updated IP network metadata available: active BGP prefixes, peering relationships, RIR registry data and Autonomous System information, giving visibility into how the global Internet is structured.

- Look up comprehensive ownership and connectivity reports for any Autonomous System Number (ASN).
- Retrieve extended network information for individual IP addresses or CIDR ranges.
- Designed for network and communication engineers, cyber security experts and IT support teams.

### Client Info (Free)

Get the user's current IP address with proxy, mobile, bot detection and user's roaming status, as well as public device OS and browser information.

- No API key required; client-side only.
- Includes a roaming detection API for mobile app developers.

## Events

The provider does not support events. BigDataCloud is a stateless data lookup service with no webhooks, event subscriptions, or purpose-built polling mechanisms.
