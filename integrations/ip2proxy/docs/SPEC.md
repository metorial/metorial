# IP2Proxy Integration Specification

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

- Returns a proxy type (VPN, TOR, DCH, PUB, WEB, SES, RES) and the provider's `isProxy` status. `YES` and `NO` describe proxy detection; some packages can return `DCH` for a hosting provider, data center, or CDN address. Other statuses are reported without assuming that they mean non-proxy.
- If no IP is provided, the server's own IP is used for lookup.

### Geolocation & Network Information

When a proxy is detected, the service returns location and network details for the IP address, including country, region, city, ISP, domain, usage type, ASN, and AS name.

- There are 11 packages (PX1 through PX11) of proxy detection web services available, each returning a different set of IP address information with different amounts of credits deducted per query.
- PX1 returns only country and proxy status; PX11 returns the full set including threat classification, residential proxy flag, and VPN provider name.
- The lookup exposes the documented `creditsConsumed` field when present. It does not infer credit usage from the chosen package.
- The provider's numeric JSON `lastSeen` value is represented as a string to preserve the existing tool contract. Provider strings, including `-` and empty optional values, are retained.

### Threat Intelligence

Higher-tier packages (PX9+) include a threat classification field indicating whether the IP has been reported for specific security threats such as email/forum spam (SPAM), network scanning (SCANNER), or botnet activity (BOTNET).

### VPN Provider Identification

The PX11 package includes the name of the VPN provider associated with the IP address, if available.

### Credit Balance Check

You can check remaining credits via a dedicated endpoint using `?key={YOUR_API_KEY}&check=1`.

Credit balances can lag current usage by 10 minutes. The tool preserves the existing string-valued balance and status fields; missing values raise an error instead of being replaced with zero or an empty status.

### Response Format

The API supports both JSON and XML responses. JSON is the default if no format is specified. The integration preserves the `responseFormat` setting and parses either transport format into the same structured tool output. The configured default package remains PX11; a tool input can override it with any PX1–PX11 value.

Invalid IP addresses are rejected before a lookup. HTTP failures and API responses whose status is not `OK` raise a provider error. Missing required response fields and malformed JSON/XML results also raise an error.

## Capability Boundary

The documented web-service surface consists of IP lookup and credit-balance checks, both covered by the existing tools. No account/profile endpoint is documented for a separate identity tool. Database-only package additions, batch products, and IP2Location.io endpoints are separate APIs and are not substituted for existing IP2Proxy connections.

## Sources

- [Official web-service API documentation](https://www.ip2location.com/web-service/ip2proxy): parameters, package fields, credit reporting delay, and JSON/XML examples.
- [Official API module documentation](https://github.com/ip2location/ip2proxy-php-api): successful response status and legacy `DCH` status meaning. The module is superseded; the hosted API remains documented separately.

## Events

The provider does not support events. IP2Proxy is a stateless lookup API with no webhook or event subscription capabilities.
