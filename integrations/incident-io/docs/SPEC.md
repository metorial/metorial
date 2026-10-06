# incident.io integration

The public API is hosted at `https://api.incident.io`. Organization requests use Bearer API keys from Settings > API keys with the appropriate account or team permissions. Identity reports the key name, roles and organization dashboard. HTTP alert ingestion instead authenticates with the source's generated secret, supplied through the optional `alertSourceToken` authentication property.

## Supported workflows

- List, read, declare and edit incidents through Incidents V2. Discover incident severities, statuses, roles, types and users. Read follow-ups through V3 and workflow configuration through V2.
- Read alerts and discover alert sources without exposing secrets. Send firing/resolved HTTP events with deduplication keys; alert routes can page responders or create incidents.
- List and read schedules, inspect scheduled/override/final coverage with a continuation cursor, create a temporary override and delete it. Omitting the override user creates a coverage gap.
- Discover catalog types and list, read, create, update or archive catalog entries through current Catalog V3. Name-only edits preserve attributes with the provider's `update_attributes` selection. Catalog reference values use the documented literal encoding. Legacy custom-field `valueLiteral` is resolved using the actual field type; select options require `valueOptionId`.
- Discover status pages; publish incidents, rename them, post updates and resolve them. Subscriber notification is optional and defaults to false. Resolving automatically restores affected component statuses, so omit componentStatuses when resolving. Legacy `major_outage` translates to the provider's `full_outage`.

Incident editing defaults to notifying its incident channel for compatibility. Retrospective incident creation without an existing Slack channel ID avoids creating a Slack channel; workflows may still run. Incidents and status-page incident history cannot be deleted through the documented workflows. No webhook/event subscription is supplied.

Pagination uses opaque cursors. Keep following the cursor until absent, regardless of page length. Schedule-entry cursors are passed as `entryWindowStart` while keeping the original end timestamp. Per-page counts are distinct from optional provider totals. HTTP requests have a 30-second timeout and do not follow redirects; ambiguous write failures require a readback before retrying.

References: [API introduction](https://docs.incident.io/api-reference/introduction), [official OpenAPI](https://api.incident.io/v1/openapiV3.json).
