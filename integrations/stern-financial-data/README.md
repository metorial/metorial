# <img src="logo.svg" height="20"> Stern Financial Data

Query public NYU Stern financial datasets from Aswath Damodaran's data pages.

This integration reads public workbook datasets and falls back to the matching
HTML table when workbook extraction fails. No authentication is required.

## Tools

- `list_sources`: list supported Stern data sources, fields, source URLs, and filter hints.
- `get_source`: retrieve one source and return filtered rows. Full output is available
  with `returnAll`, but filters and limits are recommended because rows are wide.

## Sources

- `erp`: country equity risk premiums, default spreads, corporate tax rates, and CDS data.
- `us_industry_betas`: US industry beta, leverage, tax, cash, risk, and volatility data.
- `global_industry_betas`: global industry beta, leverage, tax, cash, risk, and volatility data.

## Authentication

No authentication is required. The package uses `addNone()` and calls the public
Stern pages and workbooks directly.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
