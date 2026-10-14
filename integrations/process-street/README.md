# <img src="logo.png" height="20"> Process Street

Create and manage workflow runs from templates, complete and assign tasks, review approvals, read and update form values, and manage structured data set records. Discover users, form options, and the current API key label.

Paged list tools return `nextCursor`; pass it with the same filters to retrieve the next page. `list_workflow_runs` searches the latest 200 runs and defaults to active runs. Use `list_workflow_runs_page` to page through all accessible non-deleted runs. Data set record lists support exact, case-insensitive column filters.

Connect with an API key from organization settings. Requests use Process Street's public API at `https://public-api.process.st/api/v1.1`.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
