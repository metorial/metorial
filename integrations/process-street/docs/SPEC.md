# Process Street integration

The integration uses the [official public API](https://public-api.process.st/api/v1.1/docs/index.html) and its [OpenAPI contract](https://public-api.process.st/api/v1.1/docs/openapi.json), with `X-API-KEY` authentication. `get_current_api_key` returns the authorized key's label from `/testAuth`; it does not expose the credential.

## Supported workflows

- Discover active workflow templates and their form fields/options.
- Search the latest 200 workflow runs by workflow, name, or status; omitted search status defaults to active.
- Page through all accessible non-deleted workflow runs using `list_workflow_runs_page`.
- Create, read, update, delete, and restore workflow runs.
- List and update tasks, including assigned tasks; manage task and workflow-run assignees.
- List completed approval decisions and approve or reject individual or all pending subject tasks.
- Read and batch-update form field values. File fields require Process Street's upload API and cannot be changed by the batch value endpoint.
- Discover data sets and columns; list, get, create, update, and delete records. List filters match column values exactly and case-insensitively, combining multiple columns with AND.
- Discover users for assignment operations.

## Pagination and update semantics

Paged list tools accept an optional `cursor` and return `nextCursor` when another page exists. Reuse all filters with the next cursor. Omitting `nextCursor` means the page is complete. Task-assignee lists return all assignees without pagination; workflow-run assignee lists are paged. Cursor inputs on consolidated tools are used for list actions.

Workflow run and task updates use the provider's PUT replacement semantics: the integration reads current values and merges the requested changes, preserving omitted fields. An empty due-date string clears the due date.

Tool keys and existing field types remain compatible. The legacy workflow-run search tool retains its endpoint and filtering semantics.
