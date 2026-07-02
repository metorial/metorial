# Slates Specification for AbuseIPDB

## Overview

AbuseIPDB is a community-driven database for reporting and looking up IP addresses associated with malicious activity such as hacking, spamming, and vulnerability scanning. It provides an API to check IP reputation, report abusive IPs, and retrieve blacklists of known malicious addresses. It is commonly used by system administrators and security tools like Fail2Ban for automated threat detection and reporting.

## Authentication

AbuseIPDB uses API key authentication. Users must create a free account at [abuseipdb.com](https://www.abuseipdb.com/register) and generate an API key from the [account dashboard](https://www.abuseipdb.com/account/api).

The API key should be passed as an HTTP header:

```
Key: YOUR_API_KEY
```

Alternatively, the key can be passed as a query parameter (`?key=YOUR_API_KEY`), but the header method is recommended for security reasons.

All requests must be made over HTTPS to the base URL `https://api.abuseipdb.com/api/v2/`. The API key is tied to the user's account and plan tier (Free, Basic, or Premium), which determines available features and request limits.

## Features

### IP Address Reputation Check

Look up a single IP address (IPv4 or IPv6) to retrieve its abuse confidence score, country of origin, ISP, domain, usage type, whitelisted status, and whether it is a Tor exit node. Optionally retrieve individual abuse reports in verbose mode.

- The `maxAgeInDays` parameter controls the lookback window for reports (1–365 days, default 30).
- Verbose mode includes detailed individual reports but increases response size.

### IP Reports Retrieval

Retrieve paginated, detailed abuse reports for a specific IP address, including reporter information, categories, and comments.

- Supports pagination and configurable lookback period.
- This feature is currently in open beta.

### Subnet/Network Block Check

Check an entire subnet (CIDR notation) for reported IP addresses. Returns network details and a list of reported addresses within the block with their abuse scores.

- Free accounts are limited to /24 subnets; paid plans support up to /16.

### Report Abusive IP Addresses

Submit reports of malicious IP addresses with one or more abuse categories (e.g., SSH brute force, DDoS, fraud, port scanning) and an optional descriptive comment. A timestamp can be specified for when the attack was observed.

- At least one abuse category is required. AbuseIPDB defines a set of predefined category IDs (e.g., SSH abuse, web spam, DDoS).
- Users must strip personally identifiable information (PII) from comments.

### Bulk Reporting

Upload a CSV file containing multiple IP abuse reports in a single request. The response indicates how many reports were saved and lists any invalid entries with error details.

### Blacklist Retrieval

Download a list of the most reported IP addresses, ordered by abuse confidence score. Can be retrieved in JSON or plaintext format for direct firewall import.

- `confidenceMinimum` parameter allows filtering by minimum abuse score (paid feature).
- Can be filtered by country (include or exclude specific countries) and by IP version (IPv4 or IPv6).
- The number of IPs returned depends on the plan tier (10,000 for free, up to 500,000 for premium).

### Clear Reports for an IP Address

Delete all abuse reports that **your account** has submitted for a specific IP address. This does not affect other users' reports.

## Events

The provider does not support events.
