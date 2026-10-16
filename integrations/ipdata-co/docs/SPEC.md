# Ipdata.co API Specification

Ipdata.co provides a single IP intelligence API for geolocation, network ownership,
ASN information and threat intelligence. This integration supports the global API
at `https://api.ipdata.co` and optional EU API at `https://eu-api.ipdata.co`.
Authenticate with the `api-key` query parameter. An API key is the only required
credential; the API does not document a current-user or account-profile endpoint.

## Tools

| Tool | Request | Behavior |
| --- | --- | --- |
| `lookup_ip` | `GET /{ip}` or `GET /` | IPv4/IPv6 location and enrichment. Omitting the address looks up the requesting server, which may differ from the end user's device. |
| `bulk_lookup_ips` | `POST /bulk` | JSON array of 1–100 IP addresses; paid keys only, with each IP counting against quota. |
| `lookup_asn` | `GET /AS{number}/` | Advanced ASN ownership, CIDR prefixes, assignment metadata and upstream/downstream/peer ASNs; paid keys only. |
| `check_threat` | `GET /{ip}?fields=ip,threat` | Actual threat flags, matching blocklists, and VPN/reputation details when included by the API plan. Missing flags produce an actionable error. |
| `get_usage` | `GET /?fields=ip,count` | Request count for the connected API key in the last 24 hours, updated by the provider once a minute. |

`lookup_ip` and bulk lookups accept a `fields` list of provider field names.
The response always requests `ip` to retain the actual result identifier. Empty
field lists request the full response. `postal` maps to `postalCode` and
`time_zone` maps to `timezone`. Provider nulls are omitted from normalized optional
fields; entirely unavailable objects are omitted. Every lookup exposes `raw` with
the complete original provider response, including nulls and unmodeled fields.
The documented empty-string ASN sentinel is omitted from the normalized optional
ASN object while remaining unchanged in `raw.asn`.

Advanced ASN responses use `usage`, `country`, `ipv4_prefixes` and
`ipv6_prefixes`. These map to the existing `type`, `countryCode`, `prefixes` and
`prefixes6` output fields. Each prefix object derives its `prefix`, `ip` and
numeric `cidr` from the original CIDR, and retains the requested ASN. The API
provides no per-prefix name/country or single route; those fields are optional and
are never invented from the ASN's organization or country. Original CIDR arrays
and assignment/relationship metadata are also available.

Threat lookups expose optional `isVpn`, `blocklists` and `scores` when returned.
`isIcloudRelay` and `isDatacenter` are also optional because documented successful
responses can omit these flags; missing flags remain absent rather than false.
VPN detection and reputation scores require eligible Business/Enterprise plans.
The API is read-only and has no documented webhook lifecycle.

## Official references

- [Quick start and EU endpoint](https://docs.ipdata.co/docs/getting-started)
- [Authentication](https://docs.ipdata.co/reference/authentication)
- [Bulk lookup and quota accounting](https://docs.ipdata.co/docs/bulk-lookup)
- [Response filtering](https://docs.ipdata.co/docs/filtering-response-fields)
- [All response fields](https://docs.ipdata.co/docs/all-response-fields)
- [Advanced ASN API](https://docs.ipdata.co/docs/asn-api)
- [JSONP response with unavailable ASN and seven threat flags](https://docs.ipdata.co/docs/jsonp)
- [Threat intelligence](https://docs.ipdata.co/docs/proxy-tor-and-threat-detection)
- [Reputation scores](https://docs.ipdata.co/docs/ip-reputation-scores)
- [Quota and usage FAQ](https://docs.ipdata.co/docs/frequently-asked-questions)
- [API errors](https://docs.ipdata.co/docs/api-status-codes)
