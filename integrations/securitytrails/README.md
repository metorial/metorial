# Securitytrails

Query current and historical DNS, WHOIS, IP, and domain intelligence data. Look up domain details including DNS records, hosting providers, and subdomains. Retrieve current and historical WHOIS registration data. Search for domains and IPs using a powerful DSL query interface. Discover associated domains, explore IP neighbors, fetch IP WHOIS and user agent data, and access SSL certificate information. All operations are read-only data queries.

Check API account usage with `get_account_usage`. For large DSL domain searches, call `search_domains` with `scroll: true`, then pass its `scrollId` to `continue_domain_search` to retrieve additional batches. Scroll identifiers expire after a few minutes; stop when a batch contains no records.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
