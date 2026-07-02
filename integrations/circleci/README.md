# <img src="https://provider-logos.metorial-cdn.com/circleci-logo.svg" height="20"> Circleci

Trigger, manage, and monitor CI/CD pipelines, workflows, and jobs. Retrieve build artifacts, test metadata, and insights on project performance. Manage project settings, environment variables, contexts, checkout keys, and scheduled pipeline triggers. Approve, rerun, or cancel workflows and jobs. Configure outbound webhooks for workflow and job completion events. Manage OIDC tokens for cloud provider authentication and organization-level policies. Look up user information and track credit and compute usage across projects.

## Tools

### Cancel Job

Cancel a running job by its number. The job must be currently running to be cancelled.

### Get Flaky Tests

Retrieve a list of flaky tests detected in a project. Flaky tests are tests that have inconsistent pass/fail results across recent runs.

### Get Insights

Retrieve workflow-level insights and metrics for a project, including success rates, durations, throughput, and trends. Optionally drill down into a specific workflow to see job-level metrics or recent runs.

### Get Job

Retrieve details about a specific job by its number, including status, timing, executor info, and optionally its artifacts and test metadata.

### Get Pipeline

Retrieve details about a specific pipeline by ID, including its workflows and their statuses. Provides a comprehensive view of the pipeline's current state.

### Get Project

Retrieve information about a CircleCI project, including its VCS URL, organization, and settings.

### Get User

Retrieve information about the currently authenticated CircleCI user, including their organizations and collaborations. Optionally look up a different user by their UUID.

### Get Workflow

Retrieve details about a workflow including its status, timing, and all its jobs. Provides a comprehensive view of a workflow's execution.

### List Pipelines

List recent pipelines for a project. Optionally filter by branch. Returns pipeline IDs, statuses, and trigger information.

### Manage Context Environment Variables

List, set, or delete environment variables within a CircleCI context. Context env vars are shared across all projects that use the context.

### Manage Contexts

Create, list, get, or delete CircleCI contexts for an organization. Contexts provide a way to secure and share environment variables across projects.

### Manage Project Environment Variables

List, create, or delete environment variables for a CircleCI project. Environment variable values are masked when listed — only the last 4 characters are visible.

### Manage Schedules

Create, list, update, or delete scheduled pipeline triggers for a CircleCI project. Schedules automatically trigger pipelines at specified intervals using a timetable (hours, days, months).

### Manage Webhooks

Create, list, update, or delete outbound webhooks for a CircleCI project. Webhooks push event notifications (workflow-completed, job-completed) to external HTTP endpoints.

### Manage Workflow

Cancel, rerun, or approve a pending job within a workflow. Use this to control workflow execution — stop a running workflow, rerun it (optionally from failed jobs only), or approve a held approval job.

### Trigger Pipeline

Trigger a new CI/CD pipeline for a project. You can specify a branch or tag to build, and pass custom pipeline parameters to control which workflows run and how they behave. The project slug format is \

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
