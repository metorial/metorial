# <img src="https://provider-logos.metorial-cdn.com/github.png" height="20"> Github Actions

Manage GitHub Actions CI/CD workflows, runs, and jobs programmatically. Trigger, cancel, and re-run workflow runs, including re-running only failed jobs. List and download workflow artifacts and job logs. Create, update, and delete encrypted secrets and plaintext variables at repository, organization, and environment levels. Manage self-hosted and GitHub-hosted runners, including registration tokens, labels, and runner groups. Configure Actions permissions and policies, such as allowed actions, default GITHUB_TOKEN permissions, and fork pull request approval settings. Inspect and delete workflow caches. Retrieve workflow and run usage/billing statistics. Customize OIDC subject claim templates for cloud provider federation. Subscribe to webhook events for workflow runs, jobs, check runs, check suites, and deployments.

## Tools

### Control Workflow Run

Cancel, re-run, or delete a workflow run. Supports re-running all jobs, only failed jobs, or a specific job. Can also approve fork pull request runs and review pending deployments.

### Get Workflow Run Logs

Get download URLs for workflow run logs or individual job logs. Returns a redirect URL to download the log archive. Can also delete run logs.

### Get Workflow Run

Get detailed information about a specific workflow run, including its status, conclusion, timing, and associated commit. Also retrieves the jobs within the run and their step-level details.

### List Artifacts

List workflow artifacts for a repository or a specific workflow run. Artifacts enable data sharing between jobs and persist after workflow completion. Returns artifact metadata including size, expiration, and download information.

### List Workflow Runs

List workflow runs for a repository, optionally filtered by a specific workflow, branch, event, status, or actor. Returns run status, conclusions, and metadata for each run.

### List Workflows

List GitHub Actions workflows defined in a repository. Returns workflow definitions including their state (active/disabled), trigger events, and file paths. Use this to discover available workflows before triggering or inspecting runs.

### Manage Artifact

Get details about a specific artifact, download it (returns a download URL), or delete it. Use "get" to view metadata, "download" to get a zip archive URL, or "delete" to remove the artifact.

### Manage Caches

List, inspect, and delete GitHub Actions caches for a repository. Caches can be filtered by key prefix and git ref. Supports deleting by cache ID or cache key.

### Manage Permissions

Get or set GitHub Actions permissions for a repository. Configure whether Actions is enabled, which actions are allowed, default GITHUB_TOKEN permissions, and pull request approval settings.

### Manage Runners

List, inspect, remove, and manage self-hosted runners at the repository or organization level. Create registration and removal tokens, and manage custom labels on runners.

### Manage Secrets

List, get, create/update, or delete Actions secrets at the repository, organization, or environment level. Secret values must be encrypted with the public key before being sent. Use "get_public_key" to retrieve the encryption key needed for creating/updating secrets.

### Manage Variables

List, get, create, update, or delete Actions configuration variables at the repository, organization, or environment level. Unlike secrets, variable values are visible in API responses.

### Manage Workflow State

Enable or disable a GitHub Actions workflow. Disabled workflows will not be triggered by events. Also retrieves workflow details and usage statistics.

### Trigger Workflow

Trigger a GitHub Actions workflow run via the \

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
