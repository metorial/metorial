# IP2WHOIS Integration Specification

## Overview

IP2WHOIS is a domain WHOIS lookup service that provides registration and ownership information for domain names. The API returns comprehensive WHOIS data such as creation date, updated date, expiration date, domain age, the contact information of the registrant, mailing address, phone number, email address, nameservers the domain is using and much more. It supports the query for 1221 TLDs and 634 ccTLDs.

## Authentication

IP2WHOIS uses API key authentication. Register for free to get your API key and start using the API. Sign up at https://www.ip2whois.com/register.

Lookup requests send the API key in the documented `key` query parameter:
`https://api.ip2whois.com/v2?domain=example.com&key={YOUR_API_KEY}`.

No OAuth flow or scopes are involved. A single API key is all that is needed.

## Features

### Domain WHOIS Lookup

Retrieve domain information and WHOIS records by providing a domain name. The API returns comprehensive WHOIS data such as creation date, updated date, expiration date, domain age, the contact information of the registrant, mailing address, phone number, email address, nameservers the domain is using and much more.

- **Parameters:** Domain name (required), response format (JSON or XML).
- The free API allows you to query up to 500 WHOIS domain names per month.

### Hosted Domain Lookup

Get the list of hosted domain names by IP address in real time. The REST API supports both IPv4 and IPv6 address lookup.

- **Parameters:** IP address (required), response format (JSON or XML), page
  number (optional; omitted requests use the provider's first page). The tool
  requests JSON. A supplied page must be a positive whole number; the public
  input remains a number.
- Endpoint is at `https://domains.ip2whois.com/domains`.

### Domain Name Utilities

The integration provides local helper operations corresponding to the provider's
SDK utilities:

- **Punycode conversion:** Convert internationalized domain names (normal text) to punycode and vice versa.
- **Domain name extraction:** Extract the domain name from a full URL.
- **Domain extension extraction:** Identify common gTLD or ccTLD extensions
  using a heuristic. This is not a complete public suffix lookup.

## Response and Error Handling

Lookup results retain the provider's values and map snake_case fields to the
existing camelCase outputs. Empty strings supplied by the provider remain empty
strings. Missing fields are never replaced with invented contact details,
counts, page numbers, or domain identifiers. An unexpected payload produces a
clear error instead of a fabricated success.

Both lookup APIs document an `error` object containing `error_code` and
`error_message`. Such envelopes are treated as failures even when returned with
a successful HTTP status. HTTP and transport failures preserve provider error
details. Lookup requests have a 30-second timeout.

## Events

This integration does not expose triggers.

## Official References

- [WHOIS API](https://www.ip2whois.com/developers-api)
- [Hosted Domains API](https://www.ip2whois.com/developers-domains-api)
- [Provider Node.js SDK utilities](https://github.com/ip2whois/ip2whois-nodejs)
