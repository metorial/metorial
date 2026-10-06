# LeadIQ API capabilities

The integration uses the current public GraphQL API at `https://api.leadiq.com/graphql`. Paste the Secret Base64 API key from Settings > API Keys; it is sent directly as `Authorization: Basic <encoded-key>` and must not be encoded again. GraphQL errors are checked even when HTTP status is 200.

The five original tools remain available: contact lookup, company lookup, advanced flat/grouped search, account credit plans and contact-data feedback. Contact lookup exposes provider person IDs and forwards the past-company option in `company.searchInPastCompanies`. Phone quality maps to `qualityFilter.phone`. Company and contact results retain their original output field names. Nullable provider fields are omitted when unavailable; funding round counts are converted to numbers only when safely numeric, with the native text retained as `fundingRoundsText`.

Advanced search supports both offset and opaque cursor paging. Keep filters/sorting identical and pass `after` unchanged. Offset `skip + limit` cannot exceed 10,000. Original location arrays are expanded into current structured city/state/country filters; ISO country codes become English country names. Original date strings become Unix milliseconds, range min/max becomes start/end, industry-code strings become code objects, and total funding bounds map to `totalFundingRange`. Legacy description, funding-round-count and funding-type filter fields remain in the schema but fail with current supported-filter guidance because their equivalents are not documented; this is not a provider/API retirement claim. Optional legacy advanced contact arrays and employee range fields remain in output contracts but are not fabricated when the current advanced schema does not expose them. Use contact lookup for email/phone enrichment.

Three additional tools discover saved company lists, get a list with independently paginated entries, and manage its create/update/delete/add/remove lifecycle. Manual company saves are not enriched and are documented as free. Updates preserve omitted fields; explicit empty description clears it. Saved entry IDs differ from data-company IDs. Partial batch failures remain visible. Company-list deletion is permanent, owner-restricted and rejected for lists containing prospects; no prospect list deletion or external CRM export is introduced.

The current account operation exposes plans and available/used credits for DataHub and Universal plans. It does not document a stable current-user or organization ID, so no fabricated identity endpoint is exposed. Actual API costs, visibility, quota and rates depend on the account; the integration does not assume MCP pricing applies to direct GraphQL calls. Standard documented rate limit is 60 requests/minute, subject to custom agreements. Search and feedback history is not assumed reversible.

Feedback is a mutation returning a submission ID. The tool reports accepted submission only after that ID is present. No feedback readback/delete/reversal operation is documented. It requires identifying input, a contact value, and an invalid reason for Invalid reports.

The legacy inbound webhook trigger was removed. No replacement event handlers or trigger groups were added. Prospect-list/CRM exports, workato credentials and email-verification MCP-only capabilities are outside this bounded refresh.

Official references:

- https://developer.leadiq.com/
- https://leadiqhelp.zendesk.com/hc/en-us/articles/29375289152795-LeadIQ-Public-API-Guide
- https://leadiqhelp.zendesk.com/hc/en-us/articles/35509840045083-LeadIQ-Public-API-Overview
- https://github.com/leadiq/api-samples
