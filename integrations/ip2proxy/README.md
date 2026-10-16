# <img src="logo.png" height="20"> IP2Proxy

Detect whether an IPv4 or IPv6 address is associated with a proxy, VPN, TOR exit node, data center, search engine robot, or residential proxy. Retrieve location, network, threat, and VPN provider details according to the selected PX1–PX11 package, plus the credits consumed by the query. Omit the IP address to query the service caller's address.

Use an existing IP2Proxy web-service API key from your IP2Location account's License section. New web-service registrations are closed; the provider recommends IP2Location.io for new accounts. Existing connections continue to use the IP2Proxy API.

- `lookup_ip`: Query proxy status using the configured package or a per-query override. JSON and XML transport settings both return structured results. Provider placeholders such as `-` remain visible, and last-seen days remain a string for compatibility.
- `check_credits`: Read the remaining credit balance. The provider documents a 10-minute reporting delay.

Each lookup consumes credits according to its package. [Official API documentation](https://www.ip2location.com/web-service/ip2proxy) lists the package fields and credit costs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
