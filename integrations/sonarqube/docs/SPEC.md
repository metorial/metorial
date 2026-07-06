# SonarQube Integration Spec

## Scope

This package implements a core code-quality and triage SonarQube Web API surface for SonarQube Server and SonarQube Cloud:

- Project discovery through `api/components/search`, plus exact project-key lookup through `api/components/show`
- Component lookup and tree browsing through `api/components`
- Branch and pull request analysis discovery through `api/project_branches` and `api/project_pull_requests`
- Metric discovery and measure reads through `api/metrics` and `api/measures`
- Quality gate status through `api/qualitygates/project_status`
- Issue search, lookup, changelog reads, and guarded workflow updates through `api/issues`
- Security hotspot search, lookup, and guarded review updates through `api/hotspots`
- Rule discovery and details through `api/rules`
- Source, SCM, and duplication context through `api/sources`, `api/measures/component_tree`, and `api/duplications`
- Quality gate and language discovery through `api/qualitygates/list` and `api/languages/list`
- SonarQube Server system status through `api/system/status`
- Compute Engine task/status reads through `api/ce`

Project lifecycle management, token/user/group administration, webhooks, branch deletion, and quality gate administration remain out of scope. Issue and security-hotspot workflow mutations are in scope only through explicit `confirmWrite` tool inputs.

## Configuration

Config is one top-level object:

- `deployment`: `server` or `cloud`; defaults to `server`.
- `serverBaseUrl`: required for Server. The client normalizes it to `<serverBaseUrl>/api` and avoids duplicating `/api`.
- `cloudRegion`: `eu` or `us`; defaults to `eu`.
- `organization`: default SonarQube Cloud organization key for organization-scoped tools.
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
- Cloud v2 helpers are present but unused by public tools until a specific v2 migration is implemented.

Arrays are serialized as comma-separated query parameters, matching Sonar Web API v1 conventions. Page sizes are capped to documented endpoint limits. Branch and pull request filters are mutually exclusive across branch-aware tools; `branch` is a long-lived SonarQube branch name and `pullRequest` is a SonarQube pull request key/id.

## Tool Contracts

All tool input schemas are top-level `z.object` schemas to remain MCP/OpenAI tool bridge compatible. Conditional requirements are described in field descriptions and enforced at runtime with `ServiceError`. `search_projects.query` performs partial project-name or exact project-key search through components search, while `projectKeys` performs exact component lookups. `list_project_branches` returns long-lived branch entries suitable for the `branch` parameter, while pull request analyses stay in `list_project_pull_requests`. `search_issues.types` is restricted to supported SonarQube issue types, while current issue status and software-quality filtering use `issueStatuses`, `impactSoftwareQualities`, and `impactSeverities`. For `search_issues.severities`, current Sonar severities map to `impactSeverities`; legacy `CRITICAL`, `MAJOR`, and `MINOR` values map to API `severities`.

Outputs expose normalized fields for agent workflows and include `raw` objects for Sonar-specific fields that are not normalized yet. `search_duplicated_files` discovers file component keys with duplication metrics before `get_duplications` retrieves detailed duplication blocks. Source-code content is returned through Slate text attachments, not inline output fields. No tool returns base64 blobs or destructive mutation outputs.

## Verification

Package tests cover config/base URL validation, query parameter serialization, component-search project discovery, exact project-key lookup, project qualifier filtering, issue severity routing, branch/pull-request mutual exclusion, hotspot project/key/new-code parameters, duplicated-file discovery, branch filtering, pagination caps, Cloud organization checks, project-key fallback, quality gate identifier validation, Server-only status validation, workflow confirmation validation, source attachment metadata, authentication response validation, issue-search schema compatibility, and Sonar error normalization.

Schema regression coverage uses `describeMcpCompatibleToolSchemas('SonarQube tool input schemas', provider.actions)`.

Private live E2E coverage lives in `tests/integrations/sonarqube/tools.e2e.ts`. It can discover a readable project from the profile, or use optional fixtures for `projectKey`, `metricKeys`, `branch`, `pullRequest`, `issueKey`, `ceTaskId`, hotspot keys, and source component keys.
