# Slates Specification for Ip2Proxy

## Overview

IP2Proxy is a proxy detection web service by IP2Location that identifies whether an IP address is associated with a proxy, VPN, TOR exit node, data center, search engine robot, or residential proxy. It provides geolocation and network metadata for queried IP addresses via a REST API. Note: new registrations for the IP2Proxy web service are no longer available; IP2Location.io is the recommended successor.

## Authentication

An API key is required for the service to function. The API key can be accessed from the License section in your IP2Location account.

The API key is passed as a query parameter (`key`) in each API request:

```
https://api.ip2proxy.com/?ip={IP_ADDRESS}&key={YOUR_API_KEY}&package={PACKAGE}&format={FORMAT}
```

Only one unique API key is given per user account, even if multiple units are purchased. If you need a different API key, you should sign up using a different email account.

No OAuth or token refresh mechanism is involved — authentication is solely via the API key in the query string.

## Features

### Proxy Detection

Query any IPv4 or IPv6 address to determine if it is associated with a proxy. The service can identify VPN anonymizers, open proxies, web proxies, Tor exits, data centers, web hosting (DCH) ranges, search engine robots (SES), residential proxies (RES), consumer privacy networks (CPN), and enterprise private networks (EPN).

- Returns a proxy type (VPN, TOR, DCH, PUB, WEB, SES, RES) and an `isProxy` flag.
- If no IP is provided, the server's own IP is used for lookup.

### Geolocation & Network Information

When a proxy is detected, the service returns location and network details for the IP address, including country, region, city, ISP, domain, usage type, ASN, and AS name.

- There are 11 packages (PX1 through PX11) of proxy detection web services available, each returning a different set of IP address information with different amounts of credits deducted per query.
- PX1 returns only country and proxy status; PX11 returns the full set including threat classification, residential proxy flag, and VPN provider name.

### Threat Intelligence

Higher-tier packages (PX9+) include a threat classification field indicating whether the IP has been reported for specific security threats such as email/forum spam (SPAM), network scanning (SCANNER), or botnet activity (BOTNET).

### VPN Provider Identification

The PX11 package includes the name of the VPN provider associated with the IP address, if available.

### Credit Balance Check

You can check remaining credits via a dedicated endpoint using `?key={YOUR_API_KEY}&check=1`.

### Response Format

The API supports both JSON and XML responses. JSON is the default if no format is specified.

## Events

The provider does not support events. IP2Proxy is a stateless lookup API with no webhook or event subscription capabilities.
