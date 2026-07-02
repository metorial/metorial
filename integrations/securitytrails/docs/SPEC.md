# Slates Specification for Securitytrails

## Overview

SecurityTrails is a cybersecurity intelligence platform that provides access to current and historical DNS, IP, WHOIS, and domain-related data. The SecurityTrails API allows programmatic access to all IP, DNS, WHOIS, and company related information available in the SecurityTrails web platform. The API is read-only and there is no way of saving information.

## Authentication

SecurityTrails uses API key authentication. To authenticate requests to the SecurityTrails API you will need to include the API key in an HTTP header named `APIKEY`.

You can find your API key in the SecurityTrails control panel. You are given one API key by default once you have successfully registered your account on SecurityTrails.com.

**Header-based authentication (recommended):**

```
APIKEY: your_api_key
```

If for some reason you cannot include HTTP headers in the request, you can also provide the API key as a query parameter (e.g., `?apikey=your_api_key`), though this is discouraged because query strings are often logged in clear-text.

You can manage your API keys, including adding them, removing them, and restricting access to each of them individually by IP address.

## Features

### Domain Information

Retrieve current details and statistics about any hostname, including DNS records (A, AAAA, MX, NS, SOA, TXT), hosting provider, mail provider, and Alexa ranking. In addition to the current data, you also get the current statistics associated with a particular record. For example, for A records you'll get how many other hostnames have the same IP.

### Subdomain Discovery

Returns subdomains for a given domain. Useful for attack surface mapping and reconnaissance. The number of results is limited to 2,000 subdomains per domain, as the majority of domains have fewer than that.

### WHOIS Data

Retrieve current and historical WHOIS records for a domain, including registrant contact information, registrar, creation/expiration dates, and name servers. WHOIS data, as well as all DNS data, is updated on a daily basis.

### Historical DNS Records

Lists out specific historical information about the given domain parameter. Supports record types including A, AAAA, MX, TXT, NS, and SOA. Useful for tracking DNS changes over time and uncovering original IPs behind proxying services like Cloudflare.

### Historical WHOIS Records

Access past WHOIS records for a domain to see how ownership and registration details have changed over time. Historical WHOIS data can circumvent guarded WHOIS records.

### Associated Domains

Find domains that are related to a given domain, generally those owned by the same company. Returns information including WHOIS data, hosting provider, mail provider, and computed company name.

### Domain Search (Filter & DSL)

Filter and search specific records using DSL — a powerful SQL-like query interface to the data. Searchable fields include IPv4 address, nameserver, WHOIS email, WHOIS organization, WHOIS name, SOA email, TLD, apex domain, keyword, WHOIS city, postal code, street, and telephone. All filters are combined using AND fashion and work in combination. Statistics (TLD count, hostname count, domain count) can also be retrieved for any search query.

### IP Intelligence

- **IP Search:** Search for IP addresses using a DSL query interface, filtering by IP ranges, PTR patterns, ports, and more. Statistics include reverse DNS pattern identification, open ports, and total results.
- **IP Neighbors:** Returns the neighbors in any given IP level range, essentially allowing you to explore nearby IP addresses.
- **IP User Agents:** Fetch user agents seen during the last 30 days for a specific IPv4 address. It shows devices with egressing traffic based on large-scale web server logs.
- **IP WHOIS:** Retrieve WHOIS information for IP addresses.

### SSL Certificates

Access SSL certificate data via streaming or paginated queries. Includes certificate transparency information.

### Domain Tags

Returns tags for a given domain. Tags provide categorized metadata about domains.

### Data Feeds

Access bulk data feeds including domain feeds, DMARC feeds, subdomain feeds, and certificate transparency firehose. Feeds is a separate product from the API and requires a subscription to the feed service.

### SQL Query Interface

The SecurityTrails SQL API provides a powerful SQL-like query interface to data via certain API endpoints. This allows running SELECT-style queries against SecurityTrails datasets for advanced data retrieval.

## Events

The provider does not support events. SecurityTrails is a read-only data query API with no webhook or event subscription capabilities.
