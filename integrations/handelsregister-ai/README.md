# <img src="https://provider-logos.metorial-cdn.com/handelsregister-ai.svg" height="20"> Handelsregister.ai

Search German companies and retrieve registry profiles, financials, directors, ownership, publications, news, and official documents using the Handelsregister.ai REST API.

## Connect

Copy your API key from the [Handelsregister.ai dashboard](https://handelsregister.ai) into the API Key connection method. API key is the only supported authentication method. No additional configuration is required.

`get_account` reads your profile at no credit cost. The connection verifies your API key through this endpoint.

## Tools

The integration implements the 18 documented MCP data tools through REST and adds `get_account`:

| Workflow | Tools |
| --- | --- |
| Discovery and profile | `search_organizations`, `get_company_overview`, `get_account` |
| Financial data | `get_financials`, `get_balance_sheet`, `get_profit_and_loss` |
| Annual reports | `get_annual_financial_statements`, `get_annual_financial_statements_html` |
| People and ownership | `get_related_persons`, `get_shareholders`, `get_ubos`, `get_shareholdings`, `fetch_person` |
| Company events | `get_mergers_and_acquisitions`, `get_publications`, `get_insolvency_publications`, `get_news` |
| Files and website | `fetch_document`, `get_website_content` |

Search first when names are ambiguous. Pass a returned `entity_id` as `q` for company tools or as `company_id` for document downloads. Search returns one page; pass `next_skip` as `skip` with the same filters to continue.

Company data tools return `company`, the selected feature in `data`, and billing `meta`. The overview returns core company information. Annual reports return downloadable Markdown or HTML files, and register documents return PDF or XML (`SI`). Website content is delivered as a Markdown download. File outputs contain metadata, not inline report text. An annual report record with no returned content has `byteSize: 0` and no downloadable file.

## Credits and limits

Search costs 1 credit per page, with at most 30 results. Company retrieval costs 5 base credits plus the selected feature when it returns data. Each company tool selects only its own feature. Optional `ai_search: "on-default"` adds 20 credits even on failure. Optional `realtime_mode: "handelsregister-default"` adds 10 credits on success and cannot be combined with related persons or publications. Website retrieval always enables AI mode.

Person retrieval requires Plus, Pro, or Max and costs 15 credits including AI enrichment; optional shareholdings adds 5 credits when data is returned. Register documents cost 15 credits and allow five requests per minute. Other data requests generally allow 60 per minute. Account reads are free. No automatic retry or automatic pagination is performed. Downloads are limited to 50 MiB per response.

Financial coverage varies by subscription and available filings. Missing, null, and empty feature results are preserved; they do not establish that a company lacks the underlying real-world activity.

## References

- [Official MCP tool list](https://handelsregister.ai/en/documentation/mcp-server)
- [REST documentation](https://handelsregister.ai/en/documentation)
- [OpenAPI specification](https://handelsregister.ai/openapi.json)
- [Response reference](https://github.com/Handelsregister-AI/handelsregister-js)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
