# <img src="logo.svg" height="20"> SonarQube

Connect to SonarQube Server or SonarQube Cloud to inspect and triage code quality data from the Web API. This integration searches projects, lists branches and pull request analyses, reads metrics and measures, explores test coverage, searches issues, changes issue status, reviews security hotspots, reads rules and source context, discovers duplicated files, checks quality gates, searches dependency risks, runs SonarQube Cloud advanced code analysis, and lists operational metadata.

## Authentication

Use bearer token auth with a SonarQube Server user token or SonarQube Cloud personal access token. The token is sent in the `Authorization: Bearer <token>` header.

For SonarQube Server, configure:

- `deployment`: `server`
- `serverBaseUrl`: the SonarQube Server root URL, for example `https://sonarqube.example.com`
- `defaultProjectKey`: optional default project key for project-scoped tools

For SonarQube Cloud, configure:

- `deployment`: `cloud`
- `cloudRegion`: `eu` for `sonarcloud.io` or `us` for `sonarqube.us`
- `organization`: your SonarQube Cloud organization key, applied automatically to organization-scoped tools
- `defaultProjectKey`: optional default project key for project-scoped tools

Credential validation calls `/api/authentication/validate`. Server profiles also read `/api/server/version`. When SonarQube returns `SonarQube-Authentication-Token-Expiration`, the auth profile includes the token expiration timestamp.

## Tools

### Search Projects

`search_my_sonarqube_projects` searches accessible projects by project name or key query through component search. Use returned keys as `projectKey` inputs for project-scoped tools.

### List Branches / List Pull Requests

`list_branches` returns long-lived branch names for a project. `list_pull_requests` returns pull request analysis keys for a project.

### Search Metrics / Get Component Measures

`search_metrics` discovers available metric keys. `get_component_measures` reads current project measures for project, branch, or pull request analysis.

### Search Files by Coverage / Get File Coverage Details

`search_files_by_coverage` lists project files sorted by coverage ascending (worst first), with an optional `maxCoverage` threshold filter and a project-level coverage summary. `get_file_coverage_details` reads line-by-line coverage for one file, reporting uncovered lines and partially covered conditions.

### Get Project Quality Gate Status

`get_project_quality_gate_status` reads quality gate status by `analysisId`, `projectId`, or `projectKey`. Branch and pull request filters are supported with `analysisId` or `projectKey`, but not with `projectId`.

### Search Issues / Change Issue Status

`search_sonar_issues_in_projects` searches issues by issue key, project, file, branch, pull request, current severity, issue status, and software quality. `change_sonar_issue_status` changes an issue to `accept`, `falsepositive`, or `reopen`.

### Run Advanced Code Analysis

`run_advanced_code_analysis` runs SonarQube Cloud Advanced Code Analysis for one project file using `projectKey`, `branchName`, a project-relative `filePath`, optional complete `fileContent`, and optional `fileScope` (`MAIN` or `TEST`). Provide `fileContent` when the repository is not available in the integration runtime; otherwise the tool reads `filePath` from its current workspace. It requires SonarQube Cloud organization config and an organization with Advanced Code Analysis enabled.

### Search Dependency Risks

`search_dependency_risks` searches software composition analysis dependency risks for a project, branch, or pull request. SonarQube Cloud requires Advanced Security for the configured organization. SonarQube Server requires version 2025.4 Enterprise or higher with Advanced Security enabled.

### Search Security Hotspots / Show Security Hotspot / Change Security Hotspot Status

`search_security_hotspots` searches hotspots by project, hotspot key, branch, pull request, file, review status, resolution, and new-code period. `show_security_hotspot` reads detailed hotspot context. `change_security_hotspot_status` changes hotspot review status and resolution.

### Show Rule

`show_rule` reads detailed SonarQube rule metadata by rule key.

### Get Raw Source / Get SCM Info / Search Duplicated Files / Get Duplications

`get_raw_source` retrieves source code as a Slate text attachment instead of inline output. `get_scm_info` reads SCM blame metadata for source lines. `search_duplicated_files` discovers files with duplicated code in a project, and `get_duplications` inspects duplicated code blocks for a file.

### List Quality Gates / List Languages / Get System Status

`list_quality_gates` lists quality gates, `list_languages` lists languages known to SonarQube, and `get_system_status` reads SonarQube Server system status. System status is Server-only and returns a validation error for SonarQube Cloud configs.

## Deferred Tools

OAuth, system passcode auth, user token administration, project creation/deletion, project visibility updates, branch deletion, webhooks, user/group administration, and quality gate administration are intentionally deferred. The package focuses on code-quality read workflows plus explicit issue and security-hotspot triage actions.

SonarQube Cloud is migrating some capabilities to Web API v2. This package uses Web API v2 for advanced code analysis and dependency risks, and Web API v1 for the rest of the current tool surface.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
