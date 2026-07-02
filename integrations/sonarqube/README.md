# <img src="logo.svg" height="20"> SonarQube

Connect to SonarQube Server or SonarQube Cloud to inspect and triage code quality data from the Web API. This integration searches projects, browses components, lists branches and pull request analyses, reads measures and measure history, searches and manages issues, reviews security hotspots, reads rules and source context, checks quality gates, lists operational metadata, and inspects Compute Engine analysis tasks.

## Authentication

Use bearer token auth with a SonarQube Server user token or SonarQube Cloud personal access token. The token is sent in the `Authorization: Bearer <token>` header.

For SonarQube Server, configure:

- `deployment`: `server`
- `serverBaseUrl`: the SonarQube Server root URL, for example `https://sonarqube.example.com`
- `defaultProjectKey`: optional default project key for project-scoped tools

For SonarQube Cloud, configure:

- `deployment`: `cloud`
- `cloudRegion`: `eu` for `sonarcloud.io` or `us` for `sonarqube.us`
- `organization`: default organization key for organization-scoped tools
- `defaultProjectKey`: optional default project key for project-scoped tools

Credential validation calls `/api/authentication/validate`. Server profiles also read `/api/server/version`. When SonarQube returns `SonarQube-Authentication-Token-Expiration`, the auth profile includes the token expiration timestamp.

## Tools

### Search Projects

Search accessible projects by query or project keys. SonarQube Cloud requires an organization through input or config.

### Get Component / List Component Tree

Read component metadata and browse child components for projects, directories, files, tests, branches, or pull requests.

### List Project Branches / List Project Pull Requests

List branch and pull request analysis records for a project.

### List Metrics / Get Project Measures / Search Measure History

Discover available metrics, read current measures, and inspect historical measures for project, branch, or pull request quality trends.

### Get Quality Gate Status

Read quality gate status by exactly one of `analysisId`, `projectId`, or `projectKey`. `projectKey` may default from config.

### Search Issues / Get Issue / Get Issue Changelog / Manage Issue

Search issues by issue key, project, component, branch, pull request, resolution, status, severity, type, tags, and text query. Read a specific issue, inspect changelog entries, and manage issue workflow updates such as transitions, assignments, comments, tags, severity, and type. Mutating issue actions require explicit `confirmWrite`.

### Search Security Hotspots / Get Security Hotspot / Manage Security Hotspot

Search security hotspots by project, branch, pull request, file, review status, and resolution. Read hotspot details and change hotspot review status or resolution with explicit `confirmWrite`.

### Search Rules / Get Rule

Search SonarQube rules by text, language, repository, tag, severity, type, and status. Read rule metadata and raw remediation details by rule key.

### Get Source / Get SCM Info / Get Duplications

Retrieve source code as a Slate text attachment, read SCM blame metadata for source lines, and inspect duplicated code blocks for source components.

### Get Compute Task / Get Project Analysis Status

Inspect Compute Engine task details and current project analysis queue/status.

### List Quality Gates / List Languages / Get System Status

List quality gates, list languages known to SonarQube, and read SonarQube Server system status. System status is Server-only and returns a validation error for SonarQube Cloud configs.

## Deferred Tools

OAuth, system passcode auth, user token administration, project creation/deletion, project visibility updates, branch deletion, webhooks, user/group administration, and quality gate administration are intentionally deferred. The package focuses on code-quality read workflows plus explicit issue and security-hotspot triage actions.

SonarQube Cloud is migrating some capabilities to Web API v2. This package uses stable Web API v1 endpoints for the initial tool surface and keeps Cloud v2 base URL handling isolated in the client for future migration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
