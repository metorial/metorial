# Keyword integration

Keyword.com provides Google SERP rank tracking and AI Visibility reporting. This integration uses the documented REST APIs at `https://app.keyword.com/api/v2` with a bearer API token from Settings > Account. No additional connection configuration is required.

## Supported workflows

- Identify the current account and inspect plan, keyword usage, and refresh balances.
- Discover, retrieve, create, archive, restore, and delete tracking projects and groups.
- List, add, update, move, and delete tracked keywords; retrieve detailed rankings and up to 180 days of rank history.
- Retrieve project movement metrics, tracked regions, competitor SERP history, and the latest top 10 share-of-voice domains.
- Discover AI Visibility domains and search terms, retrieve a domain, and query visibility, sentiment, and citation analytics.

Project names identify group routes. Groups use the full `Parent[sub]Child` name. Numeric project IDs returned by project discovery identify refresh requests.

The API requires an explicit region and language when adding each keyword. Optional tracking settings are omitted unless supplied. `urlTrackingMethod: domain` remains a compatibility alias for the provider's `broad` matching mode. The original numeric ranking fields remain numeric or null; the original rank state, including `OTR`, is retained in `rawResponse`.

Keyword pagination uses `page` and `perPage`; totals and current-page values come from provider metadata. AI-domain discovery accepts `page` and retains the original pagination metadata. Counts shown in collection messages describe the returned page. Mutations retain their original API response.

There are 19 public tools. No file download/export or webhook workflow is implemented. The REST API token method does not use OAuth or token refresh; the provider's separately hosted MCP OAuth flow is outside this REST integration.

## Official references

- [SERP Tracker API](https://keyword.com/docs/serp-api/)
- [SERP OpenAPI schema](https://keyword.com/serp_api.yaml)
- [AI Visibility API](https://keyword.com/docs/ai-visibility-api/)
- [AI Visibility OpenAPI schema](https://keyword.com/aiv_api.yaml)
