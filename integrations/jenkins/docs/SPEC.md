# Jenkins Integration Specification

## Overview

The Jenkins integration exposes a REST-only CI tool surface backed by Jenkins Remote Access API and documented Jenkins HTTP endpoints. It mirrors the Jenkins MCP Server plugin's high-value CI inspection and build operation tools without requiring the MCP plugin.

Out of scope: Jenkins script console, Jenkins CLI, repo-local MCP runner wrappers, credentials administration, plugin administration, node administration, and any Jenkins MCP endpoint dependency.

## Authentication

Authentication uses Jenkins HTTP Basic authentication with:

- `baseUrl`: Jenkins controller base URL.
- `username`: Jenkins username.
- `apiToken`: Jenkins API token from the user's Jenkins profile.

The auth output stores the normalized base URL, username, API token, and detected Jenkins version when available. Profile validation calls `/me/api/json`.

POST tools use the API token credentials directly and retry with a CSRF crumb from `/crumbIssuer/api/json` when Jenkins rejects a POST for crumb-related reasons.

## Configuration

Optional configuration:

- `defaultFolderFullName`: folder full name used by listing/search tools when `folderFullName` is omitted.
- `defaultJobFullName`: job full name used by job/build tools when `jobFullName` is omitted.
- `maxLogLines`: default cap for log reads and searches, defaulting to `10000`.

## Tool Surface

| Tool | Purpose |
| --- | --- |
| `get_job` | Read job metadata, health, status, and recent builds. |
| `list_jobs` | List jobs from root or a folder, sorted by name, with `skip`/`limit` pagination and optional recursion. |
| `trigger_build` | Trigger `/build` or `/buildWithParameters` with scalar or scalar-array non-file parameters and parse the queue id from `Location`. |
| `get_queue_item` | Read `/queue/item/{id}/api/json`. |
| `get_build` | Read build metadata by number, default last build, or last-build selector. |
| `update_build` | Update build display name and/or description through stock build HTTP endpoints. |
| `get_build_log` | Read build log line windows with forward, end-relative, and opaque cursor pagination over `logText/progressiveText`, with `consoleText` fallback. |
| `search_build_log` | Search bounded console log text. |
| `rebuild_build` | Re-run a build, defaulting to the last build; use Pipeline Replay when available, otherwise trigger the job with parameters copied from the previous build. |
| `get_replay_scripts` | Read Pipeline Replay scripts when the Replay HTTP page is available. |
| `replay_build` | POST Pipeline Replay with a replacement main script and optional loaded script replacements, defaulting to the last build when `buildNumber` is omitted. |
| `get_test_results` | Read `/testReport/api/json`. |
| `get_flaky_failures` | Extract likely flaky JUnit failures from test metadata. |
| `get_job_scm` | Parse `config.xml` with `fast-xml-parser`, summarize SCM, and expose Git SCM configs with Jenkins MCP plugin-compatible `uris`, `branches`, `commit`, and `name` fields. |
| `get_build_scm` | Return build Git SCM configs from Jenkins BuildData with MCP plugin-compatible `uris`, `branches`, `commit`, and `name` fields, plus a summary. |
| `get_build_changesets` | Return Jenkins build change log sets plus flattened change entries, defaulting to the last build when `buildNumber` is omitted. |
| `find_jobs_with_scm_url` | Recursively inspect jobs and match Git SCM repository URLs with Jenkins Git loose URL matching, optional branch filtering, and `skip`/`limit` pagination over matches. |
| `who_am_i` | Read `/me/api/json`. |
| `get_status` | Read controller health/readiness, root URL status, queue sizes, and computer executor status. |

## Output Policy

Tool outputs expose stable fields such as ids, names, URLs, status/result, timestamps, queue ids, build numbers, log cursors, counts, SCM summaries, and test summaries. Raw Jenkins response objects are optional and only returned when the relevant `includeRaw` input is true.

## REST Gaps

Some Jenkins plugin capabilities do not have a stable stock REST endpoint. These tools throw clear `ServiceError` failures instead of falling back to unsafe mechanisms:

- Pipeline Replay tools when the Replay HTTP endpoints are unavailable.
- Exact in-process Jenkins status or SCM fields that Jenkins does not expose remotely.
