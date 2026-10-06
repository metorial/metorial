# <img src="https://provider-logos.metorial-cdn.com/buildkite-logo.png" height="20"> Buildkite

Discover organizations, clusters and teams, then manage CI/CD pipelines and builds. Inspect build jobs, retry a job or unblock a manual step, inspect and stop agents, download logs and artifacts, and manage build annotations.

Connect with a personal API access token containing `read_user` and the scopes needed for your operations. Organization-scoped tools accept an organization slug from `list_organizations`, or use the connection's optional default organization.

| Tools | Purpose |
| --- | --- |
| `who_am_i`, `list_organizations`, `list_clusters`, `list_teams` | Discover the current user and accessible resource IDs. |
| `list_pipelines`, `get_pipeline`, `create_pipeline`, `update_pipeline` | Discover and configure pipelines. Creating a YAML pipeline requires its repository, configuration and cluster UUID. |
| `archive_pipeline`, `delete_pipeline` | Archive/unarchive a pipeline or permanently delete it and its associated data. |
| `list_builds`, `get_build`, `create_build`, `manage_build` | Inspect or start builds, request cancellation, or rebuild the original commit and settings. Use a pipeline's build number, not its UUID. |
| `manage_job` | Retry a job or unblock a manual step using its UUID from `get_build`. |
| `list_agents`, `get_agent`, `stop_agent` | Inspect connected/stopping agents or a known agent, and request shutdown. |
| `list_artifacts`, `download_artifact`, `download_job_log` | Discover file metadata and prepare downloadable artifacts or plain-text logs. |
| `get_job_log` | Deprecated legacy inline log inspection; prefer `download_job_log`. |
| `create_annotation`, `list_annotations`, `delete_annotation` | Create, append, read or delete build annotations. |

Paginated lists return `nextPage`; null means the last page. Cancellation and agent shutdown can be asynchronous, so inspect the resource to confirm completion. Creating or retrying builds can execute repository code and consume agent capacity. Use an isolated pipeline for experiments.

See the [integration specification](./docs/SPEC.md) and [Buildkite API documentation](https://buildkite.com/docs/apis/rest-api).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
