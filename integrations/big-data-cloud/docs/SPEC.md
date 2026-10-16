# BigDataCloud Tool Reference

## Connection

Use the API key from Account → Credentials in your BigDataCloud dashboard. Requests use `https://api-bdc.net` and the documented `x-bdc-key` header. An optional `localityLanguage` connection setting controls localised names and defaults to `en`. API keys can take up to ten minutes to propagate.

API-key authentication has no OAuth refresh flow. There are no required account/workspace identifiers. The documented public API has no account/profile identity endpoint.

## Tools

| Tool | Endpoint | Behaviour |
| --- | --- | --- |
| `geolocate_ip` | `/data/ip-geolocation-full` | Geographic location, country, network, confidence polygon and hazard report. |
| `assess_ip_risk` | `/data/ip-geolocation-full` | Flattens hazard flags and exposes the full provider response as `raw`. `securityThreat` is descriptive text, not a low/moderate/high enum. |
| `reverse_geocode` | `/data/reverse-geocode-with-timezone` | Locality and `timeZone` data for coordinates. Existing `timezone` output remains supported if supplied by the provider. |
| `validate_phone_number` | `/data/phone-number-validate` | Sends `phoneNumber` as `number`, plus optional ISO country code. Returns validity and formats; no SMS or call is made. |
| `verify_email` | `/data/email-verify` | Syntax, domain mail-server and disposable/spam-domain checks; does not guarantee mailbox delivery. |
| `lookup_asn` | `/data/asn-info-full` | Sends existing `limit` as provider `peersCap`, capped at 50; exposes totals and `confidenceArea` when available. |
| `lookup_network` | `/data/network-by-ip` | Network registration, BGP prefix, address count and carriers. |
| `get_country_info` | `/data/country-info` | ISO country information, currency, calling code and languages. |
| `get_timezone_info` | `/data/timezone-info` | IANA identifier plus optional UTC Unix seconds; returns current or reference local time and offset. |
| `list_asn_peers` | `/data/asn-info-receiving-from`, `/data/asn-info-transit-to` | `direction` selects the relationship; `batchSize` is at most 50, `offset` skips entries. |
| `lookup_networks_by_cidr` | `/data/network-by-cidr` | IPv4 CIDR network hierarchy; `subnetsBatchSize` is at most 20, `subnetsOffset` pages subnets, `depthLimit` controls nesting. |

All tools are read-only. IP omission resolves the execution server’s public IP, not the end user’s device. Time zone UTC offsets are provider-formatted strings under `timeZone`; the legacy lowercase `timezone` contract is retained. Full provider objects pass through so additional fields remain available. Confidence polygons can contain multiple rings, separated where each ring repeats its first point.

## Limits and exclusions

The provider’s quota is monthly request volume; current authentication docs describe HTTP 402 for exhausted quota, while individual endpoint references also document 403. Failures retain provider HTTP status and response details. A CIDR lookup may return 406 if the range/depth produces too many results; narrow the request.

The provider’s published API products are IP Geolocation, Reverse Geocoding, Phone & Email Verification, and Network Engineering. Tool categories follow those products. Browser/mobile-only free endpoints are unsuitable for server execution. GraphQL duplicates the covered REST workflows; global routing dumps, rankings, Tor directory and specialised parsers are not part of this practical lookup surface. No file outputs or event/webhook operations are provided.

## Official documentation

- [Developer hub and API products](https://www.bigdatacloud.com/docs)
- [Authentication](https://www.bigdatacloud.com/docs/authentication)
- [API domains](https://www.bigdatacloud.com/docs/api-domains)
- [IP Geolocation API](https://www.bigdatacloud.com/ip-geolocation/ip-address-geolocation-with-confidence-area-and-hazard-report-api)
- [Reverse Geocoding with Timezone](https://www.bigdatacloud.com/reverse-geocoding/reverse-geocode-with-timezone)
- [Phone Number Validation](https://www.bigdatacloud.com/phone-email-verification/phone-number-validation-api)
- [Email Verification](https://www.bigdatacloud.com/phone-email-verification/email-verify-api)
- [ASN Info Extended](https://www.bigdatacloud.com/network-engineering/asn-info-extended-api)
- [Network by IP](https://www.bigdatacloud.com/ip-geolocation/network-by-ip-address-api)
- [Country Info](https://www.bigdatacloud.com/ip-geolocation/country-info-api)
- [Time Zone Info](https://www.bigdatacloud.com/ip-geolocation/timezone-info-api)
- [Receiving-from peers](https://www.bigdatacloud.com/network-engineering/asn-info-receiving-from)
- [Transit-to peers](https://www.bigdatacloud.com/network-engineering/asn-info-transit-to)
- [Networks by CIDR](https://www.bigdatacloud.com/network-engineering/networks-by-cidr-api)
