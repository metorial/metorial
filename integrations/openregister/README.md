# <img src="logo.svg" height="20"> OpenRegister

Research German companies, ownership, people, financial statements, insolvency proceedings, and official registry documents with OpenRegister.

## Connect

Create an API key at [OpenRegister API Keys](https://openregister.de/keys), then connect using **API Key**. No additional configuration is required. `get_credit_balance` checks remaining credits and the current period reset date. OpenRegister does not expose a user identity endpoint in the documented API.

## Research workflows

- Find companies with `search_companies`, apply structured filters with `search_companies_advanced`, or resolve a website with `lookup_company_by_url`.
- Pass the returned company ID to `get_company`, `get_company_contact`, or `get_company_financials`.
- Use `get_company_owners` for direct owners, `get_company_historical_owners` for ownership changes, `get_company_holdings` for companies owned by the subject, and `get_company_ubos` for calculated beneficial owners.
- Discover people with `search_people`, then read their profiles and investments with `get_person` and `get_person_holdings`.
- Find proceedings with `search_insolvencies` and inspect events with `get_insolvency`.
- Discover stored document IDs from `get_company` or ownership history, then request a download link with `get_stored_document`. Use `get_realtime_document` to fetch a fresh official extract or structured XML directly from Handelsregister.

## Filters, costs, and data availability

Insolvency searches require a query or at least one filter; pagination alone is not a search criterion.

Structured searches accept `query: { value }`, `filters`, and `pagination: { page, per_page }`. Company searches also support `location`. Each invocation retrieves one page; use returned pagination for the next request. Conditions are ANDed; `values` matches any of its entries. Each condition accepts exactly one of `value`, `values`, `keywords`, or the `min`/`max` pair.

Monetary filters and financial indicators use cents; employees is a count. Boolean filter values are strings (`"true"` and `"false"`). Use ISO dates such as `2026-01-01`. For example, revenue of at least EUR 1 million is `{ "field": "revenue", "min": "100000000" }`. Estimated revenue/EBITDA filters include reported figures when available; use `revenue`/`ebitda` for reported figures only. Missing data remains missing, and estimates retain distinct provider fields.

Requests consume [API credits](https://docs.openregister.de/pricing). Company details and owner lookups use cached data by default; `realtime: true` costs additional credits. Requests are not automatically retried. AG/SE owner lookups require `best_available: true`, may return historical data, and cannot combine that flag with realtime retrieval. `export` on company details omits sources; on owners it skips new document processing. Neither option creates an export file.

Stored document URLs expire after **15 minutes**; request a new link when needed. Realtime documents support current, chronological, and historical extracts, shareholder lists, articles of association, and structured information (XML). Other realtime categories produce PDF. Download links are returned directly.

Company data, ownership, contacts, and financial statements depend on registry and provider availability. A 404 can mean the requested data is unavailable; it does not necessarily mean the company is absent. Beneficial ownership results are calculated research data, not a newly ordered Transparenzregister extract.

Monitoring, webhook subscriptions, Transparenzregister credential storage, and extract ordering are outside this integration's scope.

See [tool and endpoint specification](docs/SPEC.md) and [OpenRegister documentation](https://docs.openregister.de).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
