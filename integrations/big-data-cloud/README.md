# <img src="logo.png" height="20"> Big Data Cloud

Look up IPv4 and IPv6 locations and security indicators, reverse geocode coordinates, validate phone numbers and email addresses, and inspect ASN and BGP network data.

The integration provides 11 read-only tools grouped by the provider’s four API packages:

- IP Geolocation: full geolocation and hazard information, country details, and IANA time zone conversion.
- Reverse Geocoding: locality and time zone data from latitude and longitude.
- Phone and Email Verification: number validation/formatting and email syntax, mail server and disposable-domain checks.
- Network Engineering: ASN lookup, paginated receiving-from/transit-to peers, IP network lookup, and CIDR network/subnet discovery.

Create an API key in the BigDataCloud dashboard under Account → Credentials. The optional `localityLanguage` connection setting defaults to English. Omitting an IP uses the execution server’s public IP; supply the visitor’s IP explicitly when analysing a visitor.

Use `lookup_asn` for the first peer entries, then `list_asn_peers` with `batchSize` and `offset` for additional pages. `get_timezone_info` accepts a UTC reference in Unix seconds. `lookup_networks_by_cidr` supports subnet pagination and hierarchy depth limits.

Email validation does not prove that a particular mailbox exists or guarantee delivery. Free browser/mobile-only APIs are outside this server-side integration.

[API documentation](https://www.bigdatacloud.com/docs) · [Tool reference](docs/SPEC.md)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
