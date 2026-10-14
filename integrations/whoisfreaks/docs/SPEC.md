# WhoisFreaks Integration Specification

## Overview

WhoisFreaks is a domain and IP intelligence platform that provides WHOIS, DNS, IP geolocation, subdomain discovery, SSL certificate, and security lookup data through APIs. The API allows users to retrieve information about domain names, IP addresses, and WHOIS data. This integration exposes lookup APIs, reputation assessments, domain availability checks, and account credit usage.

## Authentication

You can make authorized requests to the API by passing an API key as a query parameter. To get your API key, login to the billing dashboard and get your API key.

The API key is passed as a query parameter named `apiKey` in each request. For example:

```
GET https://api.whoisfreaks.com/v2.0/whois/live?domainName=example.com&apiKey=YOUR_API_KEY
```

If your API key has been compromised, you can change it by clicking the reset button in the billing dashboard.

No OAuth or other authentication methods are supported. The API key is the sole authentication mechanism.

## Features

### Domain WHOIS Lookup

Live WHOIS API provides well-parsed and structured information about domain names, including registration date, expiry date, registrar information, owner details, and host name server information. Live WHOIS Lookup fetches data in real time from WHOIS servers and RDAP. Supports lookups for individual domains or bulk lookups of up to 100 domains per request.

### Historical WHOIS Lookup

The WHOIS history API offers access to historical WHOIS data, including details like renewal dates, host name servers, registrant information, and registrar records. Records are deduplicated so each entry is unique.

### Reverse WHOIS Search

Reverse WHOIS lookup allows you to search domain information by owner name, email address, domain keyword, or company name. Useful for finding all domains associated with a specific registrant or organization.

### IP and ASN WHOIS Lookup

The IP WHOIS Lookup API provides detailed information about IP addresses, including registration data, contact details, routes, and network information. The ASN WHOIS Lookup API delivers information on Autonomous System Numbers, including details about ASN ownership, network infrastructure, organization details, and the range of IP addresses associated with the ASN.

### DNS Lookup

Using the Live DNS Checker API, perform real-time lookups across key DNS records including A, AAAA, CNAME, MX, NS, TXT/SPF, PTR, and SOA. Also supports historical DNS lookups and reverse DNS searches.

- **Reverse DNS**: Use the reverse DNS API to discover related domains by pivoting on DNS signals like IP addresses, mail exchange servers, nameservers, CNAMEs, and other infrastructure identifiers.
- **Bulk DNS**: Supports up to 100 domains per request.

### Subdomain Discovery

Use the Subdomains Lookup API to retrieve each subdomain with complete details such as first seen, last seen, and status. You can also retrieve sub-subdomains.

### Domain Availability

The Domain Availability API checks if a domain is available for registration or not. It also suggests other domains and their availability for registration. Supports bulk checks of up to 100 domain names per request.

- **Domain Discovery**: Domain Discover API finds all registered domains containing an exact keyword across 800M+ domains, 1500+ TLDs, and 9000+ SLDs.

### SSL Certificate Lookup

Access ASN WHOIS, verify SSL certificate details, and check real-time domain availability. Retrieves the full SSL certificate chain for a domain, including validity dates, issuer, subject, and public key details.

### IP Geolocation

The IP Location API returns detailed IP-based data, including country, region, city, ZIP code, latitude/longitude, timezone, ISP, ASN, and organization. Supports bulk lookups of up to 100 IPs per request.

### Security Lookup

Gain instant threat intelligence by identifying IPs associated with VPNs, Tor, proxies, bots, and other high-risk sources.

### Domain Reputation

Assess a domain's risk verdict, trust score, domain-generation analysis, threat intelligence matches, and supporting security signals.

### API Usage

Retrieve subscription status, API credits, served requests, surcharge usage, and request limits for the connected API key.

## Pagination and Compatibility

Historical WHOIS, historical DNS, reverse WHOIS, reverse DNS, and subdomain queries return one page at a time. Pass `page` to retrieve subsequent results and inspect the provider's pagination metadata. Response bodies are preserved, including partial lookup failures and provider-specific fields.

The existing `domain_discovery` tool is retained for compatibility. Its `/v1.0/domain-discovery` endpoint is not described in the current official API reference, so its availability remains unverified.

## Scope

Monitoring configuration, typosquatting, downloadable databases and domain feeds, bulk reputation, and custom-TLD availability requests are not exposed by this integration.

## API References

- https://whoisfreaks.com/documentation
- https://whoisfreaks.com/integrations/typescript
- https://whoisfreaks.com/documentation/credit-usage
- https://whoisfreaks.com/documentation/ip-security-api
- https://whoisfreaks.com/documentation/domain-reputation-api
