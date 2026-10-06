# PhantomBuster API coverage

Verified against the official API v2 reference and provider support guides on October 5, 2026. API-key access is available on paid plans; keys are scoped to the workspace. Authentication uses the documented `X-Phantombuster-Key-1` header, never a query parameter. The current reference UI also labels the credential `X-Phantombuster-Key`.

The integration preserves all twelve original tools and adds Download Results. No webhooks or replacement triggers are registered.

| Capability | API surface |
| --- | --- |
| Workspace identity | `GET /orgs/fetch` |
| Individual Phantom discovery/detail | `GET /agents/fetch-all`, `/agents/fetch` |
| Create/update/delete | `POST /agents/save`, `/agents/delete` |
| Queue launch/stop | `POST /agents/launch`, `/agents/stop` |
| Latest output | `GET /agents/fetch-output` |
| Execution history/detail/output/result | `GET /containers/fetch-all`, `/fetch`, `/fetch-output`, `/fetch-result-object` |
| Dynamic lead lists (beta) | `GET /org-storage/lists/fetch-all`, `/fetch`; `POST /save`, `/delete` |
| Stored leads (beta) | `POST /org-storage/leads/by-list/{listId}`, `/save`, `/save-many`, `/delete-many` |
| Legacy script-ID resolution | `GET /scripts/fetch` |
| Accumulated result files | Fixed provider S3 download host, folders returned by `/agents/fetch` |

Creation uses `org`, `script` and `branch`. Existing `scriptId` remains accepted: the script lookup must identify its exact name/owner, or explicit owner guidance is returned. Public templates use `phantombuster`/`master`. Original argument and notification inputs remain supported. Scheduling fields are optional additions; scheduling or notifications can create external effects. Execution-time-limit inputs keep their existing seconds contract; date boundaries and API v2 timestamps are milliseconds.

Execution history passes `agentId`, optional `limit`, `mode` and `beforeEndedAt`. Lead fetching nests options under `paginationOptions`; original limit/offset fields remain supported alongside provider options. A returned page is never described as the complete database. Lead deletion sends `ids`. Save outputs contain the provider receipt and returned IDs/records, rather than echoing submitted data; deletion counts are omitted unless reported by the provider.

A launch queues asynchronous work and returns a container identifier; it does not prove execution succeeded. The Phantom must be configured and have succeeded once through the dashboard. Flows cannot be launched or created through these tools. Console/result requests propagate failures, while documented empty console/result responses remain valid.

Download Results prepares existing accumulated CSV/JSON files from `https://phantombuster.s3.amazonaws.com/{orgS3Folder}/{s3Folder}/{filename}`. Storage segments and filenames are validated, and API credentials are never sent to S3. The URL has no documented expiry, so no renewal mechanism is added. A prior run must have produced the file. Individual result files cannot be deleted through the API.

Official sources: [API](https://hub.phantombuster.com/docs/api), [create a Phantom](https://support.phantombuster.com/hc/en-us/articles/32397676422546-How-to-create-a-Phantom-via-API), [result files](https://support.phantombuster.com/hc/en-us/articles/23117755693458-How-to-retrieve-a-Phantom-s-result-files-CSV-or-JSON-via-API), and the endpoint reference linked above.
