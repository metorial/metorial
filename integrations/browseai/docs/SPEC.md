# Browse AI integration

The integration uses the [Browse AI v2 REST API](https://docs.browse.ai/api/) at `https://api.browse.ai/v2`. Authenticate with an API key from the [dashboard API page](https://dashboard.browse.ai/api), sent as a Bearer token. No connection configuration or workspace ID is required.

## Workflows

- Discover robots with `list_robots`; inspect parameter types, labels, and defaults with `get_robot`.
- Run a robot with `run_task`, optionally requesting video recording. Poll `get_task` or use `list_tasks` with status, date, bulk-run, sorting, pagination, and retry filters.
- Read captured text, screenshots, and tables. `download_task_data` provides a JSON download and re-resolves temporary provider URLs when needed. Browse AI moves data larger than 100 KB to a temporary URL; original task fields remain available when returned by the provider.
- Create and inspect bulk runs; use `list_bulk_runs` for discovery and `get_bulk_run` for a paginated task list. The v2 reference documents up to 50,000 tasks per bulk run; the official bulk guide recommends submitting batches of 1,000 input parameter sets.
- List, get, create, update, pause/resume, and delete scheduled monitors. Use the recurring `schedule` expression, input overrides, and screenshot/text email notification settings. Legacy schedule details remain in returned provider data.
- Update robot cookies for authenticated websites. Each cookie should include its name and value; domain, path, expiration, and browser cookie flags are supported by the provider.
- List, create, and delete webhooks for task completion, successful tasks, failed tasks, captured-data changes, and table-export completion.
- Check the task queue with `get_system_status` when diagnosing maintenance or delayed tasks.

Robot IDs are discovered with `list_robots`; monitor, task, webhook, and bulk-run IDs come from the corresponding list tools. For downloads, signed URL deadlines stay anchored to their signing timestamp. When no issuance-anchored expiration is available, a conservative one-minute metadata recheck policy applies; retrieving unchanged metadata does not extend the provider URL’s lifetime.

Responses include provider data for fields not present in the summaries. Missing optional scalar values are omitted from summaries; nulls remain in provider data.

## Boundaries

The API-key API does not document a suitable current-user/profile endpoint. Its `/teams` operation explicitly requires an Auth0 access token for partner integrations and is not exposed by this API-key connection. The public v2 reference has no robot training, task cancellation, or export-creation operation. Table-export completion can be subscribed to through webhook management, but exports are not created through an invented endpoint.

Webhook subscription management does not register an event receiver. The current webhook documentation does not specify a cryptographic callback signature or signing secret, so this integration does not claim verified callback delivery.

## References

- [Current API reference and embedded OpenAPI contract](https://docs.browse.ai/api/)
- [Developer reference](https://developers.browse.ai/v2/reference)
- [Bulk operations guide](https://help.browse.ai/en/articles/12683563-api-guide-bulk-operations-and-large-scale-data-extraction)
- [Retrieving scraped data guide](https://help.browse.ai/en/articles/12683421-api-guide-retrieving-and-managing-scraped-data)
- [Webhook setup guide](https://help.browse.ai/en/articles/12683642-webhooks-set-up-guide)
