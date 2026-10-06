# GitHub Actions

Manage GitHub Actions workflows, runs, jobs, artifacts, secrets, variables, caches, self-hosted runners, and repository Actions policies.

Connect using a fine-grained personal access token or OAuth. Repository OAuth requests `repo`; the separate repository-and-organization OAuth option also requests `admin:org`. Fine-grained tokens require the permission for each resource: Actions, Secrets, Variables, Environments, repository Administration, organization Secrets/Variables, or organization Self-hosted runners. A token's grants do not replace the user's repository or organization access.

All API calls target `https://api.github.com`, use `Authorization: Bearer`, accept `application/vnd.github+json`, and select REST API version `2026-03-10`.

## Tools

| Tool | Outcome |
| --- | --- |
| `get_current_user` | Identify the connected GitHub user. |
| `list_workflows` | Discover workflow IDs/file paths and active/disabled state. |
| `trigger_workflow` | Dispatch a workflow on a branch/tag with string inputs; return accepted run ID and URLs. The workflow needs `workflow_dispatch` on the default branch. |
| `manage_workflow_state` | Read, enable, or disable a workflow; retain the deprecated `get_usage` action for compatibility. GitHub is closing its usage endpoint. |
| `list_workflow_runs` | Page through runs, optionally filtering workflow, actor, branch, event, status, creation date, or commit SHA. GitHub caps filtered searches at 1,000 results; narrow date ranges for larger histories. |
| `get_workflow_run` | Inspect status, attempt, commit, actor, and an optional page of jobs/steps. `jobsTotalCount` and `jobsNextPage` expose additional job pages. |
| `control_workflow_run` | Cancel, rerun all/failed/specific jobs, delete runs, approve fork runs, or approve/reject pending environment reviews. Specific jobs must belong to the supplied run. Deployment reviews require environment IDs, state, and a nonempty comment. |
| `list_pending_deployments` | Read environment IDs, wait timers, and whether the connected user can approve pending reviews. |
| `get_workflow_run_logs` | Download run logs as ZIP or individual job logs as text; permanently delete run logs. |
| `list_artifacts` | Page through repository/run artifacts by name, including expiry and associated run IDs. |
| `manage_artifact` | Inspect, download ZIP, or permanently delete an artifact. Expired artifacts cannot be downloaded. |
| `manage_secrets` | List/read metadata, retrieve encryption public keys, write encrypted values, and delete secrets at repository, organization, or environment scope. Encrypt values with LibSodium sealed boxes; secret values cannot be retrieved. |
| `manage_variables` | List/read/write/delete visible configuration values at repository, organization, or environment scope. |
| `manage_caches` | List caches and delete by ID or exact key/ref; key deletion returns GitHub's actual deleted count. |
| `manage_runners` | List/read/remove self-hosted runners, create short-lived registration/removal tokens, and manage repository or organization custom labels. Setting labels replaces all custom labels. |
| `manage_permissions` | Read/write repository Actions enablement, allowed actions, selected-action patterns, and default GITHUB_TOKEN/PR-review permissions. Selected policies require `allowedActions: selected`. |

Paginated tools accept `perPage` (1–100, default 30) and `page` (positive integer, default 1). Existing numeric ID and pagination input types remain numbers; invalid fractions and bounds are rejected before requests.

## Download behavior

Downloads provide downloadable files backed by the authenticated GitHub API endpoint, which obtains a fresh temporary redirect when fetched. The legacy `downloadUrl` field continues to contain GitHub's direct temporary download URL and expires after one minute. Request the download again for a new direct URL. The downloadable file remains retrievable while the underlying file exists and access is granted. A deleted or retention-expired file cannot be renewed.

Workflow dispatch and rerun requests indicate API acceptance; inspect the returned run ID to determine execution status and completion. Workflow execution may consume paid runner time or perform deployment and external actions configured in its YAML.

## References

- [GitHub Actions REST API](https://docs.github.com/en/rest/actions)
- [API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions)
- [OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Secret encryption](https://docs.github.com/en/rest/guides/encrypting-secrets-for-the-rest-api)

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
