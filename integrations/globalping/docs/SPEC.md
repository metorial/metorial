Now let me fetch the API spec to get more details on authentication and features:I now have enough information to write the specification.

# Slates Specification for Globalping

## Overview

Globalping is an open-source network measurement platform by jsDelivr that provides access to a globally distributed network of community-hosted probes. It allows anyone to run networking commands such as ping, traceroute, dig, and mtr on probes distributed around the globe. It can be used to optimize anycast networks, monitor latency, debug routing issues, and check for censorship in different countries.

## Authentication

Anyone can connect to and use the API without credentials. Authentication is optional, but signing up for the Globalping Dashboard and then authenticating API requests will unlock higher API limits.

**Bearer Token (API Key)**

To use authentication with the API, generate a token in the dashboard's "Tokens" page and include it in your API requests. Tokens are created at [dash.globalping.io](https://dash.globalping.io). Include the token in the `Authorization` header:

```
Authorization: Bearer YOUR_GLOBALPING_API_TOKEN
```

The API base URL is `https://api.globalping.io/v1`.

All registered users get an API key for authentication, granting them higher limits. Credits allow you to run measurements above the hourly limits and are automatically deducted from your account as needed.

## Features

### Network Measurements

Create and run network diagnostic tests from globally distributed probes. Supported commands include ping, traceroute, dig, curl, and mtr. Each measurement is created via a POST request and results are retrieved by polling with the returned measurement ID.

- **Target**: A domain name or IP address to test against.
- **Measurement type**: `ping`, `traceroute`, `dns`, `mtr`, or `http`.
- **Measurement options**: Type-specific options such as packet count for ping, protocol selection for traceroute, query type for DNS, and HTTP method/headers for HTTP tests. For ping, you can use `packets` to define how many packets to send and `ipVersion` to select IPv4 or IPv6.
- You can specify measurement IDs from previous tests to reuse the same probes.
- Only public endpoints can be targeted; no local network tests are allowed.

### Probe Location Targeting

Select which probes run your measurements using flexible location filters. The "magic" field supports a wide range of parameters and location combinations, including countries, continents, cities, US states, regions (Western Europe), ASNs, ISP names, eyeball or data center tags, and cloud region names (us-east-2).

- You can specify multiple locations in a single measurement request, each with an optional `limit` to control how many probes run from that location.
- Developers who want stricter control over selected probes can use individual location parameters (city, country, tag) in a standardized way.
- When requesting a specific number of probes, there is no guarantee that the API will respond with the exact amount.

### Probe Discovery

List and filter all available online probes by location or network, enabling targeted testing from anywhere in the world. Each probe reports its continent, region, country, city, ASN, network name, and tags (e.g., datacenter or eyeball network).

### API Health Check

Validate Globalping API health and availability to ensure reliable automation before running critical network tests.

## Events

The provider does not support events. Globalping is a request-response measurement platform with no webhook or event subscription mechanism. Measurement results are retrieved by polling the measurement ID endpoint.
