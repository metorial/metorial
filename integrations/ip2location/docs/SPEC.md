# Slates Specification for Ip2Location

## Overview

IP2Location (via IP2Location.io) is an IP intelligence service that provides geolocation data, proxy/VPN detection, domain WHOIS lookups, and hosted domain lookups based on IP addresses. There are 4 types of APIs: IP geolocation API, bulk IP geolocation API, Domain WHOIS API, and Hosted Domain API. The REST API supports both IPv4 and IPv6 address lookup.

## Authentication

IP2Location.io uses **API key** authentication. The API can work without an API key (keyless mode) but with limitations — it is free for up to 1,000 queries daily. For more queries, you need to sign up for a free plan and obtain an API key.

To authenticate, you can either include your API key as a Bearer token or as a URL parameter:

- **URL parameter:** `https://api.ip2location.io/?ip=8.8.8.8&key={YOUR_API_KEY}`
- **Bearer token:** Include the header `Authorization: Bearer {YOUR_API_KEY}`

API keys are obtained by signing up at [ip2location.io](https://www.ip2location.io). Only one unique API key is given per user account.

## Features

### IP Geolocation Lookup

Look up the geographic location and network metadata of any IP address. Returns geolocation information like country, region, city, latitude & longitude, ZIP code, time zone, ASN, AS name, AS domain name, AS usage type, AS CIDR, ISP and more. Additional data includes net speed, IDD code, area code, address type, usage type, MNC, MCC, mobile brand, IAB category, weather, elevation, and population.

- Supports both IPv4 and IPv6 addresses.
- Higher-tier plans unlock more detailed fields such as proxy data, continent/country translations, and district information.
- Geolocation coordinates represent the center of population areas and should not be used to identify specific addresses.

### Proxy and VPN Detection

Determine whether an IP address belongs to a proxy server, VPN, TOR exit node, data center, search engine bot, or residential proxy. IP2Proxy detects anonymous & open proxy, web proxy, VPN, TOR, data center, search engine spider (SES), residential proxy (RES) using IP address in real-time.

- Includes a Proxy Fraud Score metric ranging from 0 to 99, offering a quantitative measure of risk.
- Proxy data is included as part of the IP Geolocation API response (on Plus and Security plans).

### Bulk IP Geolocation Lookup

Allows users to check IP address locations in bulk, returning geolocation information like country, region, city, and so on.

- Useful for batch processing large lists of IP addresses at once.

### Domain WHOIS Lookup

The Domain WHOIS API helps users obtain domain information and WHOIS records by using a domain name. It returns comprehensive WHOIS data such as creation date, updated date, expiration date, domain age, registrant contact information, nameservers, and more. It supports the query for 1,221 TLDs and 634 ccTLDs.

- Input is a domain name; response format can be JSON or XML.

### Hosted Domain Lookup

Allows users to retrieve the list of hosted domain names by IP address in real time.

- Useful for reverse IP lookups to discover which domains are hosted on a given IP address.
- Supports both IPv4 and IPv6.
- Results are paginated when the dataset is large.

## Events

The provider does not support events. IP2Location.io is a query-based API service with no webhook or event subscription mechanism.
