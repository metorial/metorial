# <img src="logo.svg" height="20"> Statbank Norway – SSB

Search Statbank Norway – SSB tables and query public table data through PxWebApi v2.

## Tools

- `get_tables` searches or inspects Statbank Norway – SSB tables, metadata, and codelists.
- `query_table` retrieves table data with PxWeb selection expressions such as `*`, `??`, `top(3)`, `from(2024)`, and `[range(a,b)]`. Omit `selection` or pass `selection: []` to use SSB defaults; if a selection is non-empty, include every non-eliminable variable from `get_tables` metadata and batch wide pulls to stay under 800,000 cells.

Statbank Norway – SSB is public and does not require authentication.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
