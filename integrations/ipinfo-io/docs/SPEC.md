# IPinfo.io API specification

## Authentication

Connect with an API token from [the IPinfo dashboard](https://ipinfo.io/account/token). Requests use the documented `Authorization: Bearer` header over HTTPS. API access and available fields depend on the token's subscription; no OAuth scopes or refresh tokens are involved. Empty credentials fail before a request is made.

## Tools and API contracts

| Tool | API and behavior |
| --- | --- |
| `lookup_ip` | `GET https://api.ipinfo.io/lookup/{ip}` for current Core, Plus, or Max data. Optional `api: legacy` uses the maintained `GET https://ipinfo.io/{ip}/json` format, including legacy company and abuse fields when subscribed. Omitted IP uses `me` on the current API and `/json` on the legacy API. |
| `lookup_ip_lite` | `GET https://api.ipinfo.io/lite/{ip}` for free country, continent, and basic ASN information. Omitted IP uses `me`. |
| `lookup_asn` | `GET https://ipinfo.io/AS{number}/json`. Accepts a numeric ASN or an AS-prefixed ASN, case-insensitively. Requires a Custom API subscription with ASN access. Returns registration, prefixes, and available peer/upstream/downstream relationships. Prefix sizes remain strings because IPv6 counts can exceed safe integer precision. |
| `get_abuse_contact` | `GET https://ipinfo.io/{ip}/abuse`. Requires Custom API Abuse Contact access. |
| `get_ip_ranges` | `GET https://ipinfo.io/ranges/{domain}`. Requires Custom API IP Ranges access. Returns provider count and CIDRs, preserving an explicit null `redirects_to` as null in `redirectsTo`. |
| `get_hosted_domains` | `GET https://ipinfo.io/domains/{ip}`. Requires Custom API Hosted Domains access. `page` starts at 0; `limit` is 1–1000. Both accept whole numbers only. The provider reports the total and returned page data. |
| `batch_lookup` | `POST https://api.ipinfo.io/batch` with the JSON array of 1–1000 queries. Optional `api: lite` selects `/batch/lite` for free bare-IP queries; `api: legacy` selects `/batch/legacy`. Optional `filter` omits queries with no response when true. Mixed endpoint/field patterns remain available and the result map preserves provider values, including explicit nulls and per-query errors. |

IP addresses and domains are checked before they become URL segments. Required response identifiers, counts, arrays, and typed fields are validated; malformed responses produce a descriptive service error rather than invented identifiers, zero counts, or empty results. HTTP failures retain the provider's nested error details and status while removing token values from the public error.

## Output compatibility

All seven existing tool keys and existing input types and requiredness are retained. Existing output fields keep their types and nullable branches. New API selection and batch filtering fields are optional.

Detailed lookup keeps legacy top-level location fields separate from the current `geo` object. Current `as` data maps to `asn`, current `mobile` data maps to `carrier`, and current `anonymous` VPN/proxy/Tor/relay flags and provider name map to `privacy`. Missing optional data stays omitted; false flags and numeric zero values are preserved. The additive `raw` field contains the complete detailed provider response, including optional plan-specific fields not represented in the normalized output, and `isPlace` exposes the optional public-place flag.

When an IP is omitted, `me` reports the invoking server's public IP. It is not an account profile. The documented API has no suitable current-account or user-profile endpoint, so no account identity tool is offered. This lookup service documents no webhook subscription API and has no triggers.

## Sources

- [Authentication and API overview](https://ipinfo.io/developers)
- [Core API](https://ipinfo.io/developers/core-api)
- [Plus API](https://ipinfo.io/developers/plus-api)
- [Lite API](https://ipinfo.io/developers/lite-api)
- [Batch enrichment](https://ipinfo.io/developers/batch-enrichment-api)
- [ASN API](https://ipinfo.io/developers/asn)
- [Abuse Contact API](https://ipinfo.io/developers/abuse-contact-api)
- [IP Ranges API](https://ipinfo.io/developers/ranges)
- [Hosted Domains API](https://ipinfo.io/developers/hosted-domains)
