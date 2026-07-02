# <img src="https://provider-logos.metorial-cdn.com/azure-devops.png" height="20"> Azure Devops

Manage Git repositories, branches, commits, and pull requests. Create, update, query, and delete work items (bugs, tasks, user stories, epics) using boards and backlogs. Trigger and monitor CI/CD pipeline runs, view build logs, and manage pipeline definitions. Create and manage test plans, test suites, and test results. Publish and manage package feeds for NuGet, npm, Maven, and Python via Artifacts. Create and configure projects, teams, dashboards, and wikis. Manage security permissions, access control, and service hook subscriptions for event-driven integrations. Subscribe to webhooks for build, release, pipeline, code, work item, and security alert events.

## Tools

### Create Work Item

Create a new work item (bug, task, user story, epic, feature, or any custom type) in a project. Set title, description, state, assigned user, area/iteration paths, tags, and any custom fields.

### Delete Work Item

Delete a work item by moving it to the recycle bin, or permanently destroy it. Use with caution — permanent deletion cannot be undone.

### Get Pipeline Run

Get details of a specific pipeline run, or list recent runs for a pipeline. Use to check the status, result, and timeline of a build/pipeline execution.

### Get Work Item

Retrieve one or more work items by ID. Returns all fields including title, state, assigned to, area path, iteration path, and custom fields. Supports fetching multiple work items in a single request.

### List Builds

List recent builds in a project. Filter by pipeline definition, branch, status, or result. Useful for monitoring build health and finding specific build runs.

### List Pipelines

List pipelines in a project. Returns pipeline IDs and names which can be used to trigger runs or query run history.

### List Projects

List all projects in the Azure DevOps organization. Returns project names, IDs, descriptions, and states. Use to discover available projects before performing other operations.

### Manage Pull Requests

Create, list, get, update, and complete pull requests. Add reviewers, add comments, approve or reject, and complete (merge) pull requests. Covers the full pull request lifecycle.

### Manage Repositories

List, get, or create Git repositories in a project. Also lists branches and recent commits for a given repository.

### Manage Wiki

List wikis, read wiki pages, and create or update wiki page content. Supports both project wikis and code-backed wikis.

### Query Work Items

Search for work items using WIQL (Work Item Query Language) or simple filters. Runs a WIQL query and returns matching work items with their details. Use WIQL for complex queries, or provide simple filters (type, state, assignedTo, areaPath) to auto-generate a query.

### Run Pipeline

Trigger a pipeline run. Optionally specify a branch, variables, and template parameters. Returns the run ID and status for monitoring.

### Update Work Item

Update an existing work item. Change title, description, state, assignment, area/iteration paths, tags, priority, add comments, or set custom fields. Supports adding parent/child links.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
