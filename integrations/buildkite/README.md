# <img src="https://provider-logos.metorial-cdn.com/buildkite-logo.png" height="20"> Buildkite

Manage CI/CD pipelines, builds, and agents on the Buildkite platform. Create, update, archive, and delete pipelines. Trigger, list, cancel, and rebuild builds with filtering by state, branch, commit, and creator. Inspect and retry individual jobs within builds, and retrieve job logs. List, stop, pause, and resume connected agents. Manage clusters, agent queues, and agent tokens for infrastructure isolation. Organize teams with configurable roles and pipeline access. List and download build artifacts, and create build annotations. Manage test suites, identify flaky tests, and quarantine problematic tests. Create and manage package registries supporting npm, Maven, Docker, Python, Ruby, Helm, and more. Receive webhook notifications for build, job, agent, and package events.

## Tools

### Archive Pipeline

Archive or unarchive a Buildkite pipeline. Archived pipelines are hidden from the dashboard but retain their data and can be unarchived later.

### Create Annotation

Add an annotation to a Buildkite build. Annotations display additional context on the build page and support Markdown/HTML. Useful for attaching test summaries, deployment links, or status information.

### Create Build

Trigger a new build for a Buildkite pipeline. Specify the commit SHA and branch, and optionally set a message, environment variables, and metadata. Use commit "HEAD" to build the latest commit on the branch.

### Create Pipeline

Create a new CI/CD pipeline in your Buildkite organization. Specify a name, repository URL, and optionally provide YAML step configuration, branch settings, team assignments, and tags.

### Delete Pipeline

Permanently delete a Buildkite pipeline. This action is irreversible and will remove all associated builds and data. Consider archiving instead if you may need the data later.

### Get Build

Retrieve detailed information about a specific build including all its jobs/steps. Use this to inspect build results, check individual step statuses, and find job IDs for retrying or inspecting logs.

### Get Job Log

Retrieve the output log for a specific job in a Buildkite build. Useful for debugging failed builds or inspecting command output. Also supports retrieving job environment variables.

### Get Pipeline

Retrieve detailed information about a specific Buildkite pipeline by its slug. Returns configuration, repository, build counts, provider settings, and step definitions.

### List Agents

List connected Buildkite agents in your organization. Returns agent names, versions, connection states, metadata tags, and whether they are currently running a job. Only connected agents are returned.

### List Artifacts

List artifacts produced by a specific build. Returns file names, paths, sizes, and download URLs. Artifacts are files generated during build execution (test reports, binaries, logs, etc.).

### List Builds

List builds across all pipelines or for a specific pipeline. Supports filtering by state, branch, commit, and creation date. Builds are returned newest-first.

### List Pipelines

List CI/CD pipelines in your Buildkite organization. Returns pipeline names, slugs, repositories, and current build counts. Use this to discover available pipelines before triggering builds or inspecting pipeline details.

### Manage Build

Cancel or rebuild an existing Buildkite build. Cancel stops a running/scheduled build. Rebuild creates a new build with the same settings as the original.

### Manage Job

Retry a failed job or unblock a blocked step in a Buildkite build. Retry re-runs a failed or timed-out job. Unblock releases a manual/block step so the build can continue.

### Stop Agent

Stop a connected Buildkite agent. By default, the agent finishes its current job before stopping. Use force mode to stop immediately.

### Update Pipeline

Update an existing Buildkite pipeline's settings. Supports changing the name, repository, YAML configuration, branch settings, tags, and visibility. Only provided fields are updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
