# Buildkite integration specification

This integration uses the public [REST API v2](https://buildkite.com/docs/apis/rest-api) for pipeline, build, job, agent, artifact and annotation operations. It does not use the separate internal Agent API or require GraphQL access.

## Authentication and discovery

Connect with a personal API access token. Authentication identifies its owner through [GET /user](https://buildkite.com/docs/apis/rest-api/user), which requires `read_user`. Select the additional granular scopes required by the operations you intend to use. Organization access, user permissions and an active organization plan also apply.

`who_am_i` identifies the user. `list_organizations` discovers organization slugs; organization-scoped tools accept an optional `organizationSlug`, falling back to the connection's optional default organization. `list_clusters` and `list_teams` discover cluster and team UUIDs needed for pipeline creation or access assignments. Paginated list tools expose `nextPage`, which is null at the end of the list. Page sizes must be between 1 and 100.

## Pipelines

`list_pipelines` and `get_pipeline` discover and inspect pipelines. `create_pipeline` creates a YAML pipeline using a name, repository URL, nonempty configuration and `clusterUuid`. These last two fields retain their optional input shape for compatibility but are required when creating a YAML pipeline. Team assignments use the `teams` map of team UUIDs to access levels; legacy `teamUuids` remain supported and cannot be combined with `teams`.

`update_pipeline` patches only supplied settings. `archive_pipeline` archives or unarchives the pipeline while retaining its data. `delete_pipeline` permanently removes the pipeline and its associated builds and data. See the [Pipelines API](https://buildkite.com/docs/apis/rest-api/pipelines).

## Builds and jobs

`list_builds` discovers build numbers. Build-scoped operations require the pipeline's numeric build number, not the globally unique build UUID. `get_build` returns metadata and job UUIDs. Existing string-valued metadata output is preserved; non-string provider metadata values are represented as JSON strings.

`create_build` starts a build for an explicit commit and branch. `manage_build` requests cancellation of a scheduled, running or failing build, or rebuilds it using its original commit, branch and settings. Cancellation can return `canceling`; use `get_build` to check the final state. A rebuild does not fetch a newer branch commit. `manage_job` retries a job or unblocks a manual step. Retry produces a new job UUID; use that UUID for subsequent retries. See the [Builds API](https://buildkite.com/docs/apis/rest-api/builds) and [Jobs API](https://buildkite.com/docs/apis/rest-api/jobs).

## Agents

`list_agents` returns connected and stopping agents. `get_agent` can inspect a known agent in any connection state. `stop_agent` requests graceful shutdown by default, with optional force; completion is asynchronous. Write permissions and the user's agent-management permissions apply. See the [Agents API](https://buildkite.com/docs/apis/rest-api/agents).

## Downloads and annotations

`download_job_log` prepares a plain-text log and returns its byte size without first retrieving the entire log. It requires `read_build_logs`; requesting the optional job environment also requires `read_job_env`. `get_job_log` is deprecated in favor of the downloadable log and retains its legacy inline inspection contract.

`list_artifacts` discovers artifact/job UUIDs and file metadata. `download_artifact` prepares a finished artifact for download using the stable authenticated REST download endpoint. The storage URL returned by that endpoint can expire after 60 seconds; callers use the stable endpoint instead. See the [Artifacts API](https://buildkite.com/docs/apis/rest-api/artifacts).

`create_annotation` creates or appends a build annotation. `list_annotations` returns rendered HTML and IDs for readback. `delete_annotation` deletes an annotation by UUID. Read operations require `read_builds`; mutations require `write_builds`. See the [Annotations API](https://buildkite.com/docs/apis/rest-api/annotations).

There are no event subscriptions in this integration.
