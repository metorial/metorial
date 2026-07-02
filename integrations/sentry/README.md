# <img src="https://provider-logos.metorial-cdn.com/sentry.svg" height="20"> Sentry

Track, manage, and resolve application errors and performance issues. List, query, and bulk-update issues and error events with filters like status, assignment, and tags. Create and manage releases, associate commits, and upload source maps. Configure issue alert rules and metric alert rules with notification actions. Set up cron monitors to detect missed or failed scheduled jobs. Build custom dashboards with configurable widgets. Run ad-hoc Discover queries across errors and transactions for performance analysis. Manage organizations, teams, projects, and members. Provision users via SCIM. Access session replay data. Receive webhooks for issues, errors, alerts, comments, and installation events.

## Tools

### Discover Query

Run an ad-hoc query against Sentry's Discover (Events) interface. Query errors and transactions with custom fields, filters, aggregations, and sorting. Useful for performance analysis, error analysis, and custom reporting.

### Get Event

Retrieve a specific error event by ID, or list events for an issue. Returns full event details including stack traces, exception data, breadcrumbs, and contextual information.

### Get Issue Details

Retrieve detailed information about a specific Sentry issue, including its latest event with stack trace, tags, and contextual data. Optionally fetches comments and tag breakdowns.

### Get Organization

Retrieve details about the configured Sentry organization, including quotas, settings, features, and member/project counts.

### List Issues

Search and list issues in the Sentry organization. Supports Sentry's structured search query syntax for filtering by status, assignment, tags, and more.

### List Members

List members of the Sentry organization. Optionally search by name or email.

### List Projects

List all projects in the Sentry organization. Returns project slugs, names, platforms, and team assignments.

### List Teams

List all teams in the Sentry organization with their members and project assignments.

### Manage Alert Rule

List, create, update, or delete issue alert rules and metric alert rules. Issue alerts are per-project and trigger on specific error conditions. Metric alerts are organization-wide and trigger on aggregate thresholds.

### Manage Issue Comment

List, create, update, or delete comments (notes) on a Sentry issue. Comments support markdown formatting.

### Manage Cron Monitor

List, create, update, or delete cron monitors for tracking scheduled jobs. Monitors detect missed or failed check-ins and can alert when jobs don't run on schedule.

### Manage Project

Create, update, or delete a Sentry project. When creating, a team slug is required. When updating, provide the project slug and the fields to change.

### Manage Release

Create, retrieve, update, or delete a release. Also supports listing releases and creating deploys. Releases track versions of your application and can be associated with commits for suspect commit detection.

### Manage Team

Create, update, or delete a team. Also supports assigning or removing projects from a team.

### Update Issue

Update a Sentry issue's status, assignment, bookmark state, or other properties. Use this to resolve, ignore, assign, or triage issues.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
