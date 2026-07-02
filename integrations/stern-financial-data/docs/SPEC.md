# Slates Specification for Stern Financial Data

## Overview

Stern Financial Data reads public datasets from NYU Stern's Aswath Damodaran
data pages. The integration focuses on compact discovery and filtered reads for
large financial tables.

Supported sources:

- `erp`: country equity risk premium data from `ctryprem`.
- `us_industry_betas`: US industry beta data from `betas`.
- `global_industry_betas`: global industry beta data from `betaGlobal`.

## Authentication

These Stern datasets are public. No API key, OAuth flow, token, or account
configuration is needed. The integration uses the no-auth Slate authentication
method.

## Extraction

Each source has a public HTML page and workbook URL. `get_source` retrieves the
HTML page, then tries the workbook first because workbook cells preserve numeric
values and formatting. If workbook fetch or parsing fails, the tool falls back
to parsing the HTML table with the same header aliases and type coercion.

Percent values are returned as decimal numbers, for example `4.23%` becomes
`0.0423`. Original cell text can be included with `includeRaw`.

## Tools

### list_sources

Returns the supported source ids, source titles, page/workbook URLs, row fields,
and supported filters.

### get_source

Retrieves one source and applies source-specific filters.

ERP filters:

- exact country list or country text search
- Moody's rating list
- equity risk premium range
- country risk premium range
- corporate tax rate range
- sovereign CDS presence

Industry beta filters:

- exact industry list or industry text search
- row type: `industry` or `aggregate`
- beta range
- unlevered beta range
- minimum number of firms
- maximum debt-to-equity ratio

By default the tool returns up to 25 filtered rows. Use `returnAll: true` only
when full output is needed; filtered reads are preferred because rows are wide
and include many financial metrics.

## Events

The provider does not support webhooks or event subscriptions for these public
datasets. This integration is read-only and tool-only.
