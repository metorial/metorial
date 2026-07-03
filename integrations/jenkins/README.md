# <img src="logo.png" height="20"> Jenkins

Use Jenkins Remote Access API endpoints to inspect CI jobs and builds, trigger and replay builds, read queues and logs, summarize tests and SCM metadata, and check controller status.

This integration uses Jenkins HTTP Basic authentication with a username and API token. It is REST-only: it does not depend on the Jenkins MCP Server plugin, Jenkins CLI, or Jenkins script console.

## Tools

### Get Job

Get Jenkins job details, including status, health reports, and recent build references.

### List Jobs

List jobs in the root or a folder, sorted by name with `skip`/`limit` pagination and optional recursion or name filtering.

### Trigger Build

Trigger a job build with or without scalar or scalar-array parameters and return the Jenkins queue item reference.

### Get Queue Item

Inspect a queued build by queue item id, including task and executable build details when assigned.

### Get Build

Get build metadata by number, by Jenkins last-build selector, or from `lastBuild` when no build is specified.

### Update Build

Update a Jenkins build display name and/or description through stock build HTTP endpoints.

### Get Build Log

Read build console logs with progressiveText cursors and consoleText fallback.

### Search Build Log

Search build console logs with `pattern`, optional regex/case controls, context lines, bounded line scans, and result counts.

### Rebuild Build

Re-trigger a job, preferring Pipeline Replay when available and otherwise copying parameters from the source build.

### Get Replay Scripts

Read Pipeline Replay scripts when the Jenkins Pipeline Replay HTTP page is available.

### Replay Build

Run Pipeline Replay through the Pipeline Replay HTTP endpoint when available.

### Get Test Results

Fetch JUnit test report counts, suites, optional test cases, failing-case filtering, and truncation metadata.

### Get Flaky Failures

Return Jenkins JUnit `flakyFailure` entries from test metadata.

### Get Job SCM

Parse job `config.xml` and summarize SCM classes, repository URLs, branches, and credential ids.

### Get Build SCM

Return Git SCM metadata attached to a build, including repository URIs, built branches, and commit when Jenkins exposes Git BuildData.

### Get Build Changesets

Return build changeset entries with commit ids, messages, authors, timestamps, and affected paths.

### Find Jobs With SCM URL

Recursively find jobs whose Git SCM config loosely matches a repository URL and optional branch, with `skip`/`limit` pagination.

### Who Am I

Return the Jenkins identity visible to the authenticated API token.

### Get Status

Return controller, queue, node, and executor status from Jenkins HTTP APIs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
