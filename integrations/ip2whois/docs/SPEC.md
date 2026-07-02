# Slates Specification for Ip2Whois

## Overview

IP2WHOIS is a domain WHOIS lookup service that provides registration and ownership information for domain names. The API returns comprehensive WHOIS data such as creation date, updated date, expiration date, domain age, the contact information of the registrant, mailing address, phone number, email address, nameservers the domain is using and much more. It supports the query for 1221 TLDs and 634 ccTLDs.

## Authentication

IP2WHOIS uses API key authentication. Register for free to get your API key and start using the API. Sign up at https://www.ip2whois.com/register.

To authenticate API requests, you can either include your API key as a bearer token or URL parameter.

- **URL parameter:** Pass the key as a query parameter: `https://api.ip2whois.com/v2/?domain=example.com&key={YOUR_API_KEY}`
- **Bearer token:** Include an `Authorization: Bearer {YOUR_API_KEY}` header in the request.

No OAuth flow or scopes are involved. A single API key is all that is needed.

## Features

### Domain WHOIS Lookup

Retrieve domain information and WHOIS records by providing a domain name. The API returns comprehensive WHOIS data such as creation date, updated date, expiration date, domain age, the contact information of the registrant, mailing address, phone number, email address, nameservers the domain is using and much more.

- **Parameters:** Domain name (required), response format (JSON or XML).
- The free API allows you to query up to 500 WHOIS domain names per month.

### Hosted Domain Lookup

Get the list of hosted domain names by IP address in real time. The REST API supports both IPv4 and IPv6 address lookup.

- **Parameters:** IP address (required), response format (JSON or XML).
- Endpoint is at `https://domains.ip2whois.com/domains`.

### Domain Name Utilities

The SDKs and API provide helper functions for working with domain names:

- **Punycode conversion:** Convert internationalized domain names (normal text) to punycode and vice versa.
- **Domain name extraction:** Extract the domain name from a full URL.
- **Domain extension extraction:** Identify the gTLD or ccTLD from a URL or domain name.

## Events

The provider does not support events.
