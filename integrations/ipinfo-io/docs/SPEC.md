# Slates Specification for Ipinfo.io

## Overview

IPinfo.io is an IP address data and intelligence provider offering geolocation, ASN, privacy detection, carrier, company, and network data for IPv4 and IPv6 addresses. IPinfo's API services provide a mix of geolocation, ASN, privacy, carrier detection, and confidence metrics across different tiers of API services. Data is available via REST API and downloadable databases.

## Authentication

IPinfo uses **API token** authentication. After registration, you'll receive a personal API token, which is required to authenticate and make requests to the IPinfo API.

Your API token is used to authenticate you with our API and can be provided either as an HTTP Basic Auth username, a bearer token, or alternatively as a token URL parameter.

The three methods are:

1. **Token query parameter**: `https://api.ipinfo.io/lite/8.8.8.8?token=YOUR_TOKEN`
2. **HTTP Basic Auth**: Use the token as the username with an empty password — `curl -u YOUR_TOKEN: https://api.ipinfo.io/lite/me`
3. **Bearer token**: Pass as an `Authorization: Bearer YOUR_TOKEN` header

You obtain your API token by signing up at `https://ipinfo.io/signup` and finding it in your account dashboard at `https://ipinfo.io/account/token`. No OAuth2 or scopes are involved — all access control is determined by your plan tier (Lite, Core, Plus, or Enterprise).

The base URL for the current API is `https://api.ipinfo.io`.

## Features

### IP Geolocation Lookup

Look up geographic location data for any IPv4 or IPv6 address. IPinfo Core provides detailed IP address information including geolocation (city, region, country, continent, latitude/longitude, timezone, postal code). Higher tiers add radius, confidence level, and change tracking. You can also omit the IP to look up the caller's own address by using `me` as the IP parameter.

- You can request individual fields (e.g., `/country`, `/city`) to get plaintext responses instead of full JSON.
- The free Lite tier only provides country-level and continent-level geolocation.

### ASN and Network Information

The ASN API allows you to programmatically access details about an ASN, such as the assigned prefixes, related domain, and more. For IP lookups, ASN data includes ASN number, organization name, domain, route, and type (ISP, hosting, business, etc.). Available on Core tier and above.

### Privacy and Anonymity Detection

The Privacy Detection API detects VPNs, proxies, Tor exit nodes, relays, and hosting providers. Core tier provides boolean flags (anonymous, hosting, anycast, mobile, satellite). Higher tiers provide named anonymizer services, confidence metrics, and extended detection metadata.

### Residential Proxy Detection

Detect verified residential proxy IPs with metrics including usage frequency, proxy provider information, and last-seen timestamps. Available on Plus and Enterprise tiers.

### Mobile Carrier Data

IPinfo's carrier data identifies the mobile network associated with an IP address, including the carrier name and its Mobile Country Code (MCC) and Mobile Network Code (MNC). Core provides a basic mobile flag; Plus and Enterprise provide full carrier details.

### Company Data

Company Data identifies the name of the organization behind the IP, the type of business, and its domain. Available on Plus and Enterprise tiers.

### IP Ranges Lookup

IPinfo's IP Ranges API offers a reliable list of IP address ranges that are owned or operated by a company, identified by the provided domain name. You provide a domain name and receive the total count and list of IP ranges. Available on Enterprise tier.

### Hosted Domains (Reverse IP)

The Hosted Domains, or Reverse IP API returns a list of all of the domains hosted on the provided IP address. Available on Enterprise tier.

### IP WHOIS Data

Access WHOIS registration data for IP addresses including Point of Contact (POC), Organization Identifiers, and Network information. Available on Enterprise tier.

### Abuse Contact Lookup

Abuse Contact Data is contact information (usually of the network administrator) which can be used to report IP addresses that are engaged in fraudulent/malicious activities.

### Bulk/Batch Lookups

The /batch endpoint accepts a list of IPs or URL patterns and returns a JSON object with the inputs as keys and the responses as values. Supports mixing different query types (e.g., different API tiers, specific fields) in a single request. Works across all API endpoints including ASN, IP ranges, and hosted domains.

## Events

The provider does not support events. IPinfo.io is a data lookup service with no webhook or event subscription mechanism.
