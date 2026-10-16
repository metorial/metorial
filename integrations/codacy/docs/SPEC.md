# Codacy Integration

Codacy provides code quality, coverage, application security, and dependency analysis through its API v3. This integration uses account API tokens and supports Codacy Cloud and self-hosted instances.

## Authentication and organization selection

Create an account API token in **Account > Access management**. Requests send it in the `api-token` header. Access follows the token owner's roles and permissions. The optional authentication `baseUrl` selects a self-hosted API URL such as `https://codacy.example.com/api/v3`; Cloud uses `https://app.codacy.com/api/v3`. Existing connections with a base URL stored in configuration continue to use it when no authentication base URL is present.

Configuration selects the Git provider and its human-readable organization name. `list_organizations` discovers names and provider identifiers. `get_current_user` calls the documented authenticated-user endpoint and returns the account's actual ID and email. Account API tokens are used throughout; creating a repository token does not change the connection's authentication. Repository tokens expire; creating one without customization lets Codacy generate its name and use its documented one-year expiration. Custom creation requires both `name` and `expiresAt`.

## Tools and API operations

Paths below are relative to the selected API v3 URL. `org` means `organizations/{provider}/{organization}` and `analysis` means `analysis/organizations/{provider}/{organization}`.

| Tool | Operation |
| --- | --- |
| `get_current_user` | `GET /user` |
| `list_organizations` | `GET /user/organizations` |
| `list_repositories` | `GET /analysis/repositories` |
| `add_repository` | `POST /repositories` |
| `get_repository_analysis` | `GET /analysis/repositories/{repository}`; optional `GET .../analysis-progress` |
| `search_issues` | `POST /analysis/repositories/{repository}/issues/search` |
| `list_pull_requests` | `GET /analysis/repositories/{repository}/pull-requests` |
| `get_pull_request_analysis` | `GET /analysis/repositories/{repository}/pull-requests/{number}`; optional `GET .../issues` |
| `get_commit_analysis` | `GET /analysis/repositories/{repository}/commits` or `.../commits/{sha}` |
| `list_files` | `GET /org/repositories/{repository}/files` |
| `list_branches` | `GET /org/repositories/{repository}/branches` |
| `list_repository_tools` | `GET /analysis/repositories/{repository}/tools` |
| `configure_analysis_tool` | `PATCH /analysis/repositories/{repository}/tools/{uuid}` |
| `list_tool_patterns` | `GET /analysis/repositories/{repository}/tools/{uuid}/patterns` |
| `get_quality_settings` | `GET /org/repositories/{repository}/settings/quality/repository` |
| `list_coding_standards` | `GET /org/coding-standards` |
| `list_people` | `GET /org/people` |
| `search_security_items` | `POST /org/security/items/search` |
| `get_security_item` | `GET /org/security/items/{id}` |
| `set_security_item_ignored` | `POST /org/security/items/{id}/ignore` or `.../unignore` |
| `search_sbom_dependencies` | `POST /org/sbom/dependencies/search` |
| `manage_dast_target` | `GET/POST /org/dast/targets`; `DELETE .../{id}`; `POST .../{id}/analyze` |
| `manage_repository_token` | `GET/POST /org/repositories/{repository}/tokens`; `DELETE .../{id}` |

## Result and pagination behavior

Paginated results expose the provider cursor and total when available. Pull request analysis can request one page of issues with `issuesCursor` and `issuesLimit`; `issuesCursor` in the response identifies the next page. DAST target listing also exposes its next cursor. Results retain original provider responses where available, including metadata, quality/coverage analysis, dependency details, and original IDs.

Repository coverage is read from `coverage.coveragePercentageWithDecimals` (with the documented integer fallback), issue counts from `issuesCount`, complex-file counts from `complexFilesCount`, and the last analyzed commit SHA from `lastAnalysedCommit.sha`. File coverage prefers `coverageWithDecimals`; file duplication is a duplicated-line count. Pull request issues are nested under `commitIssue`, and commit timestamps use `commitTimestamp`. Missing optional metrics remain absent. Analysis progress preserves its steps and stuck-state response; no percentage is invented.

`list_pull_requests.search` is Codacy's search mode (`last-updated` or `merged`); `textQuery` filters titles or author handles. Branch names for GET analysis/file requests use the API's `branch` query parameter. Tool configuration maps the public switches to Codacy's `enabled` and `useConfigurationFile` request fields. DAST scans are asynchronous: accepted scan requests do not imply completed scans or successful security results.

## Official references

- [API usage and authentication](https://docs.codacy.com/codacy-api/using-the-codacy-api/)
- [Current API v3 reference](https://api.codacy.com/api/api-docs)
- [Current OpenAPI definition](https://api.codacy.com/api/api-docs/swagger.yaml)
- [API token lifecycle](https://docs.codacy.com/codacy-api/api-tokens/)
- [DAST scans](https://docs.codacy.com/codacy-api/examples/triggering-dast-scans/)
