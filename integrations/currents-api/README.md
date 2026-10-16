# Currents API

Retrieve current news feeds and search articles by keywords, boolean queries, date ranges, publisher domain, language, country, author, and category. Use V2 search for cursor pagination and the canonical category taxonomy. Discover valid filter values and check the connected API key.

Use `list_latest_news` for supported feed filters and pagination. The legacy `get_latest_news` tool remains available, but Currents now rejects its keyword parameter; use `search_news` for keyword searches. Existing source-directory tools are retained for compatibility, although their `/sources` and `/source` routes are absent from the current official API reference and have not been verified against the provider.

See the [API specification](docs/SPEC.md) for version differences and reference links.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
