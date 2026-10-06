# People Data Labs

Enrich, search, identify and retrieve person records; enrich and search company records; enrich IP addresses; standardize company, school, location and job-title inputs; and discover search values with autocomplete. Bulk person and company enrichment returns an ordered result for each input, including partial failures and expected credits.

Use an API key from the People Data Labs dashboard. Product entitlements, field bundles, rate limits and credit balances apply to the key. There is no documented current-user API in this integration's API surface.

Sandbox mode uses artificial person and company data on the documented person enrichment, search, identify and bulk endpoints and company enrichment/search endpoints. It never switches unsupported operations to production. Person retrieval, company bulk enrichment, IP enrichment and supporting APIs require an explicitly selected production configuration.

Production lookups can consume credits and leave request history. Person Identify charges one credit per call, including no-match responses; enrichment and search charge according to successful matches or returned records. A bulk request can partially succeed. Check each status and the reported or expected credits before retrying. A timeout can leave billing uncertain.

The legacy Skill Enrichment tool remains discoverable for compatibility and returns a retirement error without making a request. The provider removed that endpoint in April 2025. Autocomplete skill suggestions and job-title relevant skills are different supported capabilities.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
