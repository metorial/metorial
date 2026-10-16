# FaceUp integration

## Connection

Use an API key from **Integrations → API keys** and the exact data hosting region from **Settings → Organization settings**. Regions are hosting identifiers such as `eu-west-1` or `us-east-1`, rather than country abbreviations.

All operations POST JSON to `https://www.api.faceup.com/graphql`, with the API key as the `Authorization` header value and the hosting region in `X-Region`. No OAuth flow or global resource-ID configuration is required.

## Tools

| Key | Behavior |
| --- | --- |
| `get_report_statistics` | Always requests `reportCountByMonth`. Accepts a date range and optional classification filters. `additionalMetrics` selects other documented counts, timing metrics, or breakdowns. The existing monthly result is unchanged; additive `statistics` retains every selected value, including null comparisons. |
| `list_reports` | Retrieves one cursor page of report metadata. Follow `endCursor` while `hasNextPage` is true. `first` must be a positive whole number. |
| `get_report` | Retrieves the existing metadata fields for a report ID from `list_reports`. Missing or inaccessible reports produce an error. |
| `sync_employees` | Creates or updates employee entries by email. Requires name, email, and Active/Inactive status; optional organizational fields are supported. A request contains 1–1,000 employees. Entries omitted from the batch remain unchanged. |

Statistics dates accept ISO dates or timestamps, with the start no later than the end. Optional filters cover status, creation origin, deadline, justification, priority, source, tag, rating, and closing reason. Metric names and filter values are constrained to the official published choices. Monthly counts stay included even when extra metrics are selected. Comparison values may be null when no start date is supplied; original values remain in `statistics` without invented numeric defaults.

Employee sync is atomic: a validation failure rejects the entire batch. The provider documents a limit of ten sync requests per second; callers must pace larger imports. The tool does not retry write operations automatically. A successful output includes the provider's `success` flag and the number of entries submitted, not an inferred number of changed employees.

## Errors and compatibility

HTTP and GraphQL failures produce structured service errors, retaining the upstream status, nested messages, and GraphQL extension code where available. Missing required response data fails explicitly. The report tools retain their existing keys, field types, nullability, and pagination contract; no synthetic identifiers, states, timestamps, or empty results are supplied.

FaceUp's public guide documents statistics and employee sync. It does not publish the existing `reports`/`report` query contracts. These queries remain available for compatibility, but their current provider acceptance and report field availability require account-level verification.

No suitable current-user/profile endpoint is publicly documented. No identity endpoint is invented. Messages, internal comments, report mutations, downloads, and webhook subscriptions are outside this tool surface. FaceUp documents webhook configuration in its administration UI; this integration registers no triggers.

## Official references

- [API setup](https://support.faceup.com/api)
- [Statistics query, filters, and metrics](https://support.faceup.com/integrating-faceup-statistics-with-power-bi)
- [Employee synchronization](https://support.faceup.com/api-employee-synchronization)
- [Webhook configuration](https://support.faceup.com/webhooks)
