# IP2Location

Look up IP address geolocation, detect proxies and VPNs, perform domain WHOIS lookups, and retrieve hosted domains by IP. Supports single and bulk IP geolocation queries returning country, region, city, coordinates, timezone, ASN, ISP, and more. Detects anonymous proxies, VPNs, TOR exit nodes, data center IPs, and residential proxies with fraud scoring. Retrieves WHOIS records for domain names including registration dates, registrant info, and nameservers. Performs reverse IP lookups to discover domains hosted on a given IP address. Supports both IPv4 and IPv6.


Four read-only tools cover single and bulk IP geolocation, domain WHOIS, and hosted-domain lookups. Results retain the full provider response in `providerData`, including plan-specific network, geographic, and security details. Geolocation and domain intelligence tools are grouped separately for selection.

Connect an IP2Location.io API key for all APIs. Keyless connections support only single-IP geolocation and are subject to provider limits; bulk lookup requires a paid plan. Translation applies to geographic detail objects in single-IP results on supported plans. Hosted-domain results use page-based pagination.

Provider documentation: [IP geolocation](https://www.ip2location.io/ip2location-documentation), [bulk geolocation](https://www.ip2location.io/ip2location-bulk-documentation), [WHOIS](https://www.ip2location.io/ip2whois-documentation), and [hosted domains](https://www.ip2location.io/ip2whois-domains-documentation).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
