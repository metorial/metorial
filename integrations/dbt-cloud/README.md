# <img src="https://provider-logos.metorial-cdn.com/dbt-cloud.png" height="20"> Dbt Cloud

Manage dbt Cloud account operations for accounts, projects, environments, jobs, runs, artifacts, users, and webhook subscriptions. Discover accessible accounts, projects, and environments, inspect jobs, trigger or retry job runs, monitor run status, cancel queued or running jobs, list and download run artifacts as attachments, audit account users, and create, update, test, or delete webhook subscriptions for job run events.

## Tools

### Cancel Run

Cancel a currently queued or in-progress dbt Cloud job run. The run must be in a cancellable state (Queued, Starting, or Running). Returns the updated run status.

### Get Account

Retrieve details about the configured dbt Cloud account. Returns account name, plan tier, run slots, developer seat count, and billing information. Useful for verifying the account configuration and available resources.

### Get Environment

Retrieve details about a specific dbt Cloud environment, including its type, dbt version, credentials, repository, and branch settings.

### Get Job

Retrieve detailed information about a specific dbt Cloud job, including its schedule, execution steps, settings, and run history metadata. Use this to inspect a job's full configuration before triggering or modifying it.

### Get Project

Retrieve details about a specific dbt Cloud project, including repository and connection identifiers. Use this after listing projects when you need the full project record or related resources.

### Get Run Artifact

Fetch an artifact file from a completed dbt Cloud run as a Slate attachment. Supports retrieving `manifest.json`, `run_results.json`, and `catalog.json`.

### Get Run

Retrieve detailed information about a specific dbt Cloud job run. Returns status, timing, duration, git info, run steps, and execution details. Use this to monitor a triggered run or inspect a completed run's results.

### Get Run Failure Details

Retrieve retry-related failure details for a failed dbt Cloud run, including the failed step and skipped steps when available.

### Get Webhook

Retrieve a dbt Cloud webhook subscription by ID, including subscribed events, target URL, active state, and scoped job IDs when available.

### List Environments

List all environments for a given dbt Cloud project. Returns environment names, types, dbt versions, and configuration details. Useful for inspecting available deployment targets and their settings.

### List Accounts

List dbt Cloud accounts accessible to the token on the configured base URL. Use this when an account-scoped tool needs accountId and the user has not already provided one.

### List Jobs

List dbt Cloud jobs, optionally filtered by project or environment. Returns job names, schedules, settings, and execution configuration. Use this to discover available jobs that can be triggered or monitored.

### List Projects

List all projects in the dbt Cloud account. Returns project names, IDs, repository info, and connection details. Use this to discover available projects before performing operations on specific ones.

### List Run Artifacts

List artifact file paths generated for a completed dbt Cloud run. Use this before fetching a specific artifact such as manifest.json, run_results.json, catalog.json, or sources.json.

### List Runs

List dbt Cloud job runs with optional filters for job, project, environment, or status. Returns run IDs, statuses, timing, and duration. Useful for monitoring recent execution history and identifying failed or long-running jobs.

### List Users

List all users in the dbt Cloud account. Returns user names, email addresses, and license information. Useful for auditing account membership and permissions.

### List Webhook Events

List delivery events for a dbt Cloud webhook subscription. Use this to inspect recent webhook deliveries and troubleshoot downstream receipt behavior.

### List Webhooks

List dbt Cloud webhook subscriptions configured for the account. Use this to discover webhook IDs before retrieving, updating, testing, or deleting a subscription.

### Manage Webhook

Create, update, or delete a dbt Cloud webhook subscription. Webhooks notify external systems when job runs start, complete, or fail. Supports scoping to specific jobs and configuring which event types to listen for.

### Retry Failed Job

Retry the latest failed run for a dbt Cloud job from the point of failure when possible. If dbt Cloud cannot retry from failure, it enqueues a normal job run.

### Retry Run

Retry a failed dbt Cloud run. dbt Cloud enqueues a new run and returns its run ID and status so it can be monitored with Get Run.

### Test Webhook

Send a dbt Cloud test event to a webhook subscription endpoint and return the test delivery result.

### Trigger Job Run

Trigger a new run for a dbt Cloud job. Supports overriding dbt version, threads, target name, timeout, doc generation, and execution steps. If the job is already running, the new run will be enqueued. Returns the created run's details including its ID for monitoring.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
