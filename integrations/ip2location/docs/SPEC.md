# IP2Location specification

## Authentication and configuration

API-key connections send the key as an HTTPS Bearer token. Keyless connections support only single-IP geolocation; bulk, WHOIS, and hosted-domain lookups require a key. Bulk lookup requires a paid plan. The optional connection language setting preserves the documented enum and defaults to English. It affects single-IP geographic detail translations on supported plans.

There are no tenant or resource identifiers in connection configuration. No OAuth refresh or identity endpoint is documented.

## Tools and API families

| Tool | API request | Behavior |
| --- | --- | --- |
| `ip_geolocation_lookup` | `GET https://api.ip2location.io/` | IPv4/IPv6 geolocation with network and security data available to the plan. |
| `bulk_ip_geolocation` | `POST https://bulk.ip2location.io/` | 1–1000 newline-separated addresses; returns IP-keyed provider records as a result list. |
| `domain_whois_lookup` | `GET https://api.ip2whois.com/v2/` | Domain registration, registrar, contacts, dates, age and nameservers. |
| `hosted_domain_lookup` | `GET https://domains.ip2whois.com/domains` | Page-based reverse-IP domain lookup; totals map from `total_domains`. |

Geolocation and IP2WHOIS domain intelligence have separate selectable tool categories. Every tool retains its original input and output fields. Optional additive output exposes complete provider data. Single-IP output also exposes fraud score, AS details, geographic details/translations, and geotargeting.

The provider returns security fraud score at the top level. The legacy `proxy.fraudScore` summary receives that value when a complete proxy summary is available; genuine older nested scores remain supported. Optional proxy/timezone summaries are omitted when source values cannot satisfy their original scalar contracts. Complete source values, including nulls, remain in `providerData`. Required malformed response fields produce a service error instead of invented defaults.

All requests use JSON responses and HTTPS with timeouts. HTTP and nested API errors retain provider messages/codes. Inputs receive runtime IP, domain, and pagination validation without changing published schema types. Provider-supplied empty WHOIS contact strings are preserved.

## Scope and limits

There are no file outputs, events, triggers or webhooks. Coordinates describe approximate population locations and must not identify street addresses. Availability varies by plan and region. Provider behavior has been checked against documentation, without authenticated or keyless live API calls.

## Official references

- [API index](https://www.ip2location.io/documentation)
- [IP geolocation](https://www.ip2location.io/ip2location-documentation)
- [Bulk geolocation](https://www.ip2location.io/ip2location-bulk-documentation)
- [Domain WHOIS](https://www.ip2location.io/ip2whois-documentation)
- [Hosted domains](https://www.ip2location.io/ip2whois-domains-documentation)
