# Slates Specification for Ipdata.co

## Overview

Ipdata.co is an IP geolocation and threat intelligence API. It provides a simple HTTP-based API that allows you to look up the location, ownership and threat profile of any IP address. It offers a fast, highly-available API to enrich IP Addresses with Location, Company, Threat Intelligence and numerous other data attributes.

## Authentication

Authentication requires an `api-key` query parameter to be passed with all requests made to the API. For example: `https://api.ipdata.co?api-key=YOUR_API_KEY`.

The API handles authentication via API keys passed in as a query string parameter called `api-key` or a header of the same name.

You need an API Key to use the API. You can get a free one with a 1,500 daily request limit by signing up on the ipdata website.

Paid users can secure their API Key by whitelisting domains and server IPs, restricting where the key can be used from.

## Features

### IP Geolocation Lookup

Look up the geographic location of any IPv4 or IPv6 address. Locate visitors by IP address with city and postal code granularity. Returns data including continent, country, region, city, latitude, longitude, and postal code. You can look up the calling IP (no parameter needed) or any specific IP address.

- Responses can be filtered to return only specific fields.
- A dedicated EU endpoint (`https://eu-api.ipdata.co`) is available to ensure that end user data stays in the EU, routing requests through EU servers (Paris, Ireland and Frankfurt) only.

### Bulk IP Lookup

The API provides a bulk endpoint that allows you to look up up to 100 IP addresses at a time. Results can be filtered to specific fields.

### Threat Intelligence

Check if an IP address is listed in any of 100+ Threat Feeds instantaneously. The API detects Proxy and Tor users, as well as known spammers and bad bots. Returns flags such as `is_tor`, `is_proxy`, `is_anonymous`, `is_known_attacker`, `is_known_abuser`, `is_threat`, and `is_bogon`.

- Machine learning generated reputation scores are available for advanced threat detection.

### Company / Organization Data

Get the name and domain of the organization that owns any IP address. Determine whether an IP address belongs to an ISP, Datacenter or Business.

- Company data may only be available on higher-tier plans.

### ASN Data

Detailed ASN data is provided for all IP addresses with the following fields: AS Name, AS Number, AS Route, the AS Organization's domain and the usage type. Coverage includes ~100K ASNs.

- A basic ASN lookup is available as a sub-field of any IP lookup.
- A dedicated endpoint is available to query detailed ASN information by passing an ASN directly (e.g., `AS2`).

### Mobile Carrier Detection

Detect the mobile carrier associated with an IP address, including carrier name, MCC (Mobile Country Code), and MNC (Mobile Network Code).

### Timezone Detection

Returns timezone information for an IP address, including the timezone name, abbreviation, UTC offset, and whether daylight saving time is active.

### Currency Detection

Returns the local currency for the IP address's country, including currency name, code, symbol, and plural name.

### Language Detection

Returns the languages spoken in the country associated with the IP address.

### Response Field Filtering

Any lookup can be filtered to return only specific fields, reducing response size and improving efficiency. Pass the desired field names as query parameters.

## Events

The provider does not support events. Ipdata.co is a lookup-only API with no webhook or event subscription mechanism.
