# Kadoa Integration

## Authentication

Connect with your workspace API key from Settings > General. Requests use the `x-api-key` header. The connection has no additional configuration fields.

## Supported workflows

- Discover workflows with `list_workflows`, then inspect their configuration and optional run history with `get_workflow_details`.
- Create a persistent workflow with `create_workflow`: provide target URLs and a natural-language `userPrompt`. The returned workflow ID can be passed to the existing workflow tools. Preview is left enabled.
- Start a run with `run_workflow`, retrieve its structured data with `get_workflow_data`, and pause, resume, delete, schedule, or update it with `manage_workflow`.
- For custom recurring schedules, pass `schedules` and optionally an IANA `timezone` to `manage_workflow` with `action: update_metadata`. Its optional `limit` accepts null to remove the record limit.
- Start a crawl with `start_crawl`, then use the session ID with `get_crawl_results`. Individual page content is returned in the existing `pageContent` field and as a downloadable HTML, Markdown, or text file. Page-list responses include pagination metadata.
- Use `adhoc_extraction` for the existing one-off extraction modes. `list_locations` discovers country names and ISO codes for manual routing.
- Inspect monitored workflow changes with `get_data_changes`.

Pagination and record limits must be whole numbers in the documented ranges.

## Official references

- [API authentication](https://docs.kadoa.com/api-reference/introduction)
- [Create a workflow](https://docs.kadoa.com/api-reference/workflows/create-a-new-workflow) and [prompt-based REST examples](https://docs.kadoa.com/docs/sdk/workflows/create)
- [Workflow list](https://docs.kadoa.com/api-reference/workflows/get-all-workflows), [details](https://docs.kadoa.com/api-reference/workflows/get-workflow-by-id), [data](https://docs.kadoa.com/api-reference/workflows/get-workflow-data-by-id), and [history](https://docs.kadoa.com/api-reference/workflows/get-the-workflow-history)
- [Run workflow](https://docs.kadoa.com/api-reference/workflows/run-a-workflow), [schedule](https://docs.kadoa.com/api-reference/workflows/schedule-a-workflow), and [update metadata](https://docs.kadoa.com/api-reference/workflows/update-workflow-metadata)
- [Start crawl](https://docs.kadoa.com/api-reference/crawling/start-crawling-session), [crawl status](https://docs.kadoa.com/api-reference/crawling/crawling-session-status), [page list](https://docs.kadoa.com/api-reference/crawling/get-crawled-pages), and [page content](https://docs.kadoa.com/api-reference/crawling/get-crawled-page-meta)
- [Locations](https://docs.kadoa.com/api-reference/locations/get-all-locations)
- [Changes](https://docs.kadoa.com/api-reference/monitoring/get-all-changes) and [change details](https://docs.kadoa.com/api-reference/monitoring/get-change-by-id)

The existing ad-hoc route remains available for compatibility; its current detailed reference was not reachable during this refresh. Schema discovery and account identity were not added because their precise REST contracts could not be verified from accessible official pages.
