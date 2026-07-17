# SonarQube Integration Spec

## Scope

This package implements a core code-quality and triage SonarQube Web API surface for SonarQube Server and SonarQube Cloud:

- Project discovery through `api/components/search`
- Branch and pull request analysis discovery through `api/project_branches` and `api/project_pull_requests`
- Metric discovery and current measure reads through `api/metrics` and `api/measures`
- Quality gate status through `api/qualitygates/project_status`
- Issue search and status changes through `api/issues`
- Security hotspot search, detail reads, and review status changes through `api/hotspots`
- Rule details through `api/rules`
- Source, SCM, and duplication context through `api/sources`, `api/measures/component_tree`, and `api/duplications`
- Coverage discovery through `api/measures/component_tree` (files by coverage) and `api/sources/lines` (line-by-line coverage details)
- Quality gate and language discovery through `api/qualitygates/list` and `api/languages/list`
- SonarQube Server system status through `api/system/status`

Project lifecycle management, token/user/group administration, webhooks, branch deletion, quality gate administration, Compute Engine task/status reads, measure history, broad component browsing, issue changelog reads, and rule search remain out of scope.

## Configuration

Config is one top-level object:

- `deployment`: `server` or `cloud`; defaults to `server`.
- `serverBaseUrl`: required for Server. The client normalizes it to `<serverBaseUrl>/api` and avoids duplicating `/api`.
- `cloudRegion`: `eu` or `us`; defaults to `eu`.
- `organization`: SonarQube Cloud organization key, injected automatically into organization-scoped calls. Required when deployment is cloud; not used for Server.
- `defaultProjectKey`: default project key for project-scoped tools.

Runtime validation throws `ServiceError` through `createApiServiceError` when required combinations are missing, such as Cloud project search without an organization or project-scoped calls without `projectKey` or `defaultProjectKey`.

## Authentication

The integration uses token auth only. Tokens are sent as bearer tokens against Web API v1 endpoints. `getProfile` verifies `/api/authentication/validate`; Server profiles additionally read `/api/server/version`. If response headers include `SonarQube-Authentication-Token-Expiration`, the value is captured on the profile as `tokenExpiresAt`.

System passcode auth is deferred because it is primarily for endpoints such as monitoring/metrics rather than the read-first quality workflow surface.

## Client Behavior

The client uses `createAuthenticatedAxios`, `requestAxios`, and `requestAxiosData` from `slates`. API failures are normalized with `buildApiServiceError`, including Sonar `errors[].msg`, `msg`, and `message` fields. Cloud 429 responses include rate-limit retry context in the error message. Project/component not-found responses on project-scoped calls add diagnostics to verify the project key, `cloudRegion`, `organization`, token Browse permission, and branch or pull request scope.

Base URLs:

- Server v1: normalized `<serverBaseUrl>/api`
- Cloud v1 EU: `https://sonarcloud.io/api`
- Cloud v1 US: `https://sonarqube.us/api`
- Cloud v2 helpers are used by `run_advanced_code_analysis` and `search_dependency_risks`. Server dependency-risk calls use `/api/v2/sca/issues-releases`.

Arrays are serialized as comma-separated query parameters, matching Sonar Web API conventions. Page sizes are capped to documented endpoint limits. Branch and pull request filters are mutually exclusive across branch-aware tools; `branch` is a long-lived SonarQube branch name and `pullRequest` is a SonarQube pull request key/id.

## Tool Contracts

All tool input schemas are top-level `z.object` schemas to remain MCP/OpenAI tool bridge compatible. Conditional requirements are described in field descriptions and enforced at runtime with `ServiceError`. `search_my_sonarqube_projects.q` performs project-name or project-key search through components search. `list_branches` returns long-lived branch entries suitable for the `branch` parameter, while pull request analyses stay in `list_pull_requests`. `search_sonar_issues_in_projects` uses the official current issue fields: `projects`, `files`, `issueKey`, `severities`, `issueStatuses`, and `impactSoftwareQualities`. `run_advanced_code_analysis` accepts the official A3S request fields (`projectKey`, `branchName`, `filePath`, `fileScope`) plus optional `fileContent` for hosted integration runtimes, falls back to reading `filePath` from the current workspace, sends file content to the A3S API, and returns `issues`, `patchResult`, and `analysisErrors`. `search_dependency_risks` mirrors the official SCA response with `issuesReleases` and `paging`. `search_files_by_coverage` mirrors the official coverage search (component tree sorted ascending by the `coverage` metric, files without coverage dropped, `maxCoverage` filter inclusive) and `get_file_coverage_details` computes the official line/branch coverage summary from `api/sources/lines` records.

Outputs expose normalized fields for agent workflows. `search_duplicated_files` discovers file component keys with duplication metrics before `get_duplications` retrieves detailed duplication blocks. Source-code content is returned through Slate text attachments, not inline output fields. No tool returns base64 blobs or full source text in structured output.

## Verification

Package tests cover config/base URL validation, query parameter serialization, component-search project discovery, project qualifier filtering, issue severity routing, branch/pull-request mutual exclusion, hotspot project/key/new-code parameters, duplicated-file discovery, branch filtering, pagination caps, Cloud organization checks, project-key fallback, quality gate identifier validation, Server-only status validation, source attachment metadata, authentication response validation, advanced-analysis and dependency-risk endpoint routing, issue-search schema compatibility, and Sonar error normalization.

Schema regression coverage uses `describeMcpCompatibleToolSchemas('SonarQube tool input schemas', provider.actions)`.

Private live E2E coverage lives in `tests/integrations/sonarqube/tools.e2e.ts`. It can discover a readable project from the profile, or use optional fixtures for `projectKey`, `projectSearchQuery`, `metricKeys`, `branch`, `pullRequest`, `issueKey`, hotspot keys, rule keys, mutable finding keys, source component keys, dependency-risk enablement, and advanced-analysis file content.
