# Slates Specification for Whoisfreaks

## Overview

WhoisFreaks is a domain and IP intelligence platform that provides WHOIS, DNS, IP geolocation, subdomain discovery, SSL certificate, and security lookup data through APIs. The API allows users to retrieve information about domain names, IP addresses, and WHOIS data. It also offers domain monitoring, brand monitoring, and domain availability checking services.

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

The Domain Availability API checks if a domain is available for registration or not. It also suggests other domains and their availability for registration. Supports bulk checks of up to 100 domains per request with custom TLD lists.

- **Domain Discovery**: Domain Discover API finds all registered domains containing an exact keyword across 800M+ domains, 1500+ TLDs, and 9000+ SLDs.

### SSL Certificate Lookup

Access ASN WHOIS, verify SSL certificate details, and check real-time domain availability. Retrieves the full SSL certificate chain for a domain, including validity dates, issuer, subject, and public key details.

### IP Geolocation

The IP Location API returns detailed IP-based data, including country, region, city, ZIP code, latitude/longitude, timezone, ISP, ASN, and organization. It also detects VPN/proxy usage, threat indicators, and parses user-agent data for device-level insights. Supports bulk lookups of up to 100 IPs per request.

### Security Lookup

Gain instant threat intelligence by identifying IPs associated with VPNs, Tor, proxies, bots, and other high-risk sources.

### Domain Monitoring

Monitor your domains' WHOIS continuously. Choose a check frequency from every 10 minutes up to every 24 hours. Track only the WHOIS fields that matter most. Focus on key domain status and registration updates to get relevant alerts.

### Brand Monitoring

Tracks newly registered and dropped domains, along with real-time updates on domain WHOIS registration data across a spectrum of keywords—from exact matches to typo variants. Enables typo-squatting detection to identify and generate results. Results can be retrieved in JSON format via API.

### Newly Registered & Expiring Domains Data Feeds

Discover and retrieve the latest WHOIS data for newly registered domain names across 1528 TLDs. Also provides a detailed list of expiring and dropped domains, along with backlink insights.

## Events

The provider does not support webhooks or event subscriptions through its API. Domain monitoring and brand monitoring features provide alerts via email and Telegram notifications, but there is no webhook or programmatic event subscription mechanism available.
