# <img src="logo.svg" height="20"> Sixtyfour

Search and research people and companies, discover contact details, run bulk enrichment, and inspect Atlas investigations through the Sixtyfour API.

## Setup

Create an API key in [Sixtyfour Settings → API Keys](https://app.sixtyfour.ai/keys). The connection validates it by reading your organization credit balance. No additional configuration is required.

Research, contact discovery, searches and bulk jobs consume organization credits. Atlas requires separate organization access. Start with the lowest research tier that meets your needs.

## Tools

The integration follows the intelligence tools documented by the [official MCP server](https://docs.sixtyfour.ai/developer-tools/mcp-setup):

- Organization credit balance.
- Company and people search: discover fields, explore field values, search and paginate. Search results include the complete provider record.
- Similar-people search: start, poll and retrieve ranked results.
- People/company intelligence, email/phone discovery, reverse email/phone lookup, LinkedIn enrichment and shared job status.
- Bulk people/company intelligence, with downloadable results.
- Age verification and status.
- Atlas investigation start, status, listing, inspection and file download.

Submit asynchronous jobs once, retain the returned `task_id`, and poll the matching status tool. A timed-out submission may still have created a billable job; do not blindly resubmit. Atlas supports a client `dispatch_id` for recovery.

## API adaptations

The provider publishes tool names and workflows but requires authentication to expose exact MCP schemas. This implementation follows those documented workflows using the public REST schemas; exact schema parity has not been verified.

- Search pages return complete records directly, so separate company and person detail tools are not provided. Use `page_size` to bound response size.
- `count_only: true` is rejected before making a request because the public REST contract does not support it.
- Similar-people CSV input is converted to LinkedIn URL seeds locally.
- Atlas workspace files and bulk results are provided as downloadable files. Atlas files are complete downloads rather than inline text chunks.
- Atlas tools remain visible and report provider access errors when the organization lacks entitlement.
- Authentication uses an API key; hosted MCP OAuth and the separate documentation MCP server are outside this integration.

See [SPEC](docs/SPEC.md) for API mappings and verification requirements.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
