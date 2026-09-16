# GitHub Integration Specification

## Overview

GitHub is a cloud-based platform for version control and collaboration using Git. It provides hosting for software repositories along with features for issue tracking, code review, project management, CI/CD (GitHub Actions), and package hosting. GitHub offers both REST and GraphQL APIs for programmatic access to its platform resources.

## Notable Tool Contracts

- `create_repository` creates a repository in the authenticated user's account unless
  `organization` is provided. `private` defaults to `true`; pass `false` explicitly to
  create a public repository. `autoInit` initializes the repository with a README.
- `merge_pull_request` accepts the optional snake-case fields `commit_title`,
  `commit_message`, and `merge_method`. Supported merge methods are `merge`, `squash`,
  and `rebase`.
- `list_issues` uses GraphQL cursor pagination. Pass `pageInfo.endCursor` from one
  response as `after` to fetch the next page. `state` accepts `OPEN` or `CLOSED` and
  returns both states when omitted. Labels are supplied as an array. Custom issue
  fields can be filtered with `field_filters` entries containing `field_name` and
  `value`.
- `issue_read` consolidates issue detail, comment, hierarchy, and label reads. Its
  `get` method includes best-effort parent/child relationship signals and custom issue
  field values.
- `pull_request_read` consolidates pull request detail, diff, status, file, commit,
  review-thread, review, conversation-comment, and check-run reads.
- `list_pull_requests` is for repository filters such as state and branches. To filter
  pull requests by author, use `search` with type `issues` and GitHub search qualifiers
  such as `is:pr author:<login>`.
- `star_repository` deliberately consolidates both star and unstar operations through
  its required `action` field.
- `search` covers organizations through GitHub's user-search endpoint: use type
  `users` with the `type:org` qualifier.
- `create_branch` creates a branch from `from_branch`, or from the repository's
  default branch when the source is omitted.
- `push_files` writes multiple plain-text files atomically in one commit through the
  Git tree, commit, and ref APIs. If the requested branch is absent, it is created
  from the default branch.
- `get_repository_tree` reads a tree at an optional SHA, branch, or tag, supports
  recursive traversal, and can filter returned entries by a path prefix.
- `update_pull_request_branch` starts GitHub's base-branch update for a pull request;
  `expectedHeadSha` provides optimistic concurrency protection.
- `sub_issue_write` supports `add`, `remove`, and `reprioritize`. `sub_issue_id` is
  the issue database ID rather than the issue number, and reprioritization requires
  exactly one of `after_id` or `before_id`.
- `get_global_security_advisory` and `list_global_security_advisories` expose the
  public GitHub Advisory Database with GHSA, CVE, ecosystem, severity, CWE,
  withdrawn-state, affected-package, and date filters.

## Added Tool Coverage

The tools below expose focused GitHub capabilities with stable identifiers and
structured results. A classic OAuth token must include the listed scope. For
fine-grained tokens and GitHub Apps, grant the equivalent repository,
organization, notification, security, or Projects permission.

### Security and code quality

| Tool | OAuth scope | User outcome |
| --- | --- | --- |
| `get_code_scanning_alert` | `security_events` | Read one code scanning alert by repository and alert number, including rule, severity, location, state, and dismissal details. |
| `list_code_scanning_alerts` | `security_events` | Triage repository alerts by state, Git ref, severity, scanning tool, and page. The state defaults to `open`. |
| `get_dependabot_alert` | `security_events` | Read one Dependabot alert by repository and alert number, including dependency, advisory, severity, and remediation details. |
| `list_dependabot_alerts` | `security_events` | List Dependabot alerts by state or severity and continue with the returned cursor. The state defaults to `open`. |
| `get_secret_scanning_alert` | `security_events` | Read one secret scanning alert by repository and alert number, including secret type, location, state, and resolution. |
| `list_secret_scanning_alerts` | `security_events` | List secret scanning alerts by state, resolution, secret type, and page. |
| `list_repository_security_advisories` | `security_events` | List one repository's private security advisories by state, sort field, and direction. |
| `list_org_repository_security_advisories` | `security_events` | List repository security advisories across an organization by state, sort field, and direction. |
| `get_code_quality_finding` | `repo` or `public_repo` | Read one code quality finding by repository and finding number, including diagnostic and remediation details when available. |

### Notifications

| Tool | OAuth scope | User outcome |
| --- | --- | --- |
| `list_notifications` | `notifications` | List the authenticated user's notification inbox, optionally including read items, limiting to participating threads, filtering by RFC3339 timestamps, or limiting to one repository. `owner` and `repo` must be supplied together. |
| `get_notification_details` | `notifications` | Read one notification thread by `notificationID`; use `list_notifications` first when the ID is unknown. |
| `manage_notification_subscription` | `notifications` | Watch, ignore, or delete a notification-thread subscription by `notificationID`. |
| `manage_repository_notification_subscription` | `notifications` | Watch, ignore, or delete notification subscription settings for a repository. |
| `mark_all_notifications_read` | `notifications` | Mark notifications read through `lastReadAt`, defaulting to the current time. Supplying `owner` and `repo` together limits the operation to that repository. |
| `dismiss_notification` | `notifications` | Mark a thread `read` or `done`; `done` removes it from the notification inbox. |

### Discussions

| Tool | OAuth scope | User outcome |
| --- | --- | --- |
| `list_discussion_categories` | `repo` or `public_repo` | List category node IDs and names for a repository. Omitting `repo` reads organization-level categories from the owner's `.github` repository. |
| `list_discussions` | `repo` or `public_repo` | List discussions with cursor pagination, category filtering, optional page-local title/body filtering, and paired ordering controls. `orderBy` and `direction` must be supplied together. |
| `get_discussion` | `repo` or `public_repo` | Read a discussion by repository-local number with its body, category, answer state, author, timestamps, and permalink. |
| `get_discussion_comments` | `repo` or `public_repo` | Read a cursor-paginated page of top-level comments. `includeReplies: true` also returns up to 100 replies per top-level comment. |
| `discussion_comment_write` | `repo` or `public_repo` | Add, reply to, update, or delete discussion comments and mark or unmark accepted answers. See the conditional fields below. |

`discussion_comment_write` uses these conditional fields:

- `add` requires `owner`, `repo`, `discussionNumber`, and `body`.
- `reply` also requires the parent `commentNodeID`. Discussions support one
  level of nested replies.
- `update` requires `commentNodeID` and `body`.
- `delete`, `mark_answer`, and `unmark_answer` require `commentNodeID`.

### GitHub Projects

| Tool | OAuth scope | User outcome |
| --- | --- | --- |
| `projects_list` | `read:project` | List user or organization projects, or list fields, items, and status updates for a project. Methods other than `list_projects` require `project_number`. Item reads accept either `fields` IDs or `field_names`, never both. |
| `projects_get` | `read:project` | Get a project, field, item, or status update. Project, field, and item reads require `owner` and `project_number`; field and item reads also require their corresponding ID. A status-update read requires only `status_update_id`. |
| `projects_write` | `project` | Create a project, add/update/delete items, publish status updates, or create an iteration field. Each method validates its own owner, project, item, field, and date inputs before changing data. |

For `projects_write`, `create_project` requires `owner_type` and `title`.
`add_project_item` requires `project_number`, `item_type`, `item_owner`,
`item_repo`, and the matching issue or pull request number.
`update_project_item` requires `project_number`, `updated_field`, and exactly
one item locator: `item_id` or `item_owner` + `item_repo` + `issue_number`.
`delete_project_item` requires `project_number` and `item_id`.
`create_iteration_field` requires `project_number`, `field_name`,
`start_date`, and a positive `iteration_duration`.

### Repository and account reads

| Tool | OAuth scope | User outcome |
| --- | --- | --- |
| `fork_repository` | `repo` or `public_repo` | Fork a repository to the authenticated account or the optional `organization`, returning created-fork metadata or an `in_progress` status for asynchronous forks. |
| `list_starred_repositories` | `repo` or `public_repo` | List repositories starred by `username`, or by the authenticated user when it is omitted, with sort direction and page controls. |

## Expanded Consolidated Contracts

All tools in this section require `repo` or `public_repo`.

### `manage_workflow`

`manage_workflow` covers GitHub Actions listing, inspection, downloads, job-log
troubleshooting, and run operations while retaining the existing `action`
values `list_workflows`, `list_runs`, `get_run`, `trigger`, `cancel`, `rerun`,
and `list_jobs`.

- Listing methods are `list_workflows`, `list_workflow_runs`,
  `list_workflow_jobs`, and `list_workflow_run_artifacts`.
  `list_workflow_runs` optionally accepts a workflow ID or filename as
  `resource_id` plus `workflow_runs_filter`. Job and artifact listing require
  the workflow run ID as `resource_id`. Job listing accepts
  `workflow_jobs_filter.filter` as `latest` or `all`.
- Read methods are `get_workflow`, `get_workflow_run`, `get_workflow_job`,
  `get_workflow_run_usage`, `get_workflow_run_logs_url`, and
  `download_workflow_run_artifact`. Each requires `resource_id`; only
  `get_workflow` accepts a workflow filename instead of a numeric ID.
- Run methods are `run_workflow`, `rerun_workflow_run`, `rerun_failed_jobs`,
  `cancel_workflow_run`, and `delete_workflow_run_logs`. `run_workflow`
  requires `workflow_id` and `ref`; all other run methods require `run_id`.
- For one job's logs, omit `method` and provide `job_id`. For all failed jobs
  in a run, provide `run_id` with `failed_only: true`. `tail_lines` defaults
  to 500. With `return_content: false`, the result contains authenticated
  download endpoints. With `return_content: true`, each requested log is a
  downloadable text file and the structured result contains only file name,
  MIME type, byte count, line counts, truncation state, and job IDs.
- Downloaded workflow artifacts are returned as ZIP files. The structured
  result contains artifact ID, file name, MIME type, and byte count rather
  than embedding the archive bytes.

### `comment_on_issue`

`comment_on_issue` accepts `issue_number` or the existing `issueNumber` alias
and can create a comment, add a reaction, or do both in one call.

- At least one of `body` or `reaction` is required.
- Omitting `comment_id` targets the issue or pull request itself.
- Providing `comment_id` targets that issue comment, requires `reaction`, and
  cannot be combined with `body`. The comment is verified to belong to the
  requested issue before the reaction is added.
- Review-comment reactions belong in `review_pull_request`, not this tool.

### `manage_issue`

`manage_issue` supports explicit `create` and `update` methods. Existing calls
may omit `method`; providing either issue-number field selects update behavior.

- `create` requires `title`; `update` requires `issue_number` or
  `issueNumber`.
- `type` uses an issue type returned by `list_issue_types`.
- Every `issue_fields` entry requires `field_name` and exactly one of
  `value`, `field_option_name`, or `delete: true`.
- Closing as a duplicate requires `state: "closed"`,
  `state_reason: "duplicate"`, and `duplicate_of`. `duplicate_of` is not
  accepted for other state reasons.
- `stateReason` remains an accepted existing alias. If both state-reason
  fields are supplied, their values must agree.

### `manage_labels`

`manage_labels` creates, updates, renames, deletes, and continues to list
repository labels through the existing `action: "list"` operation.

- Supply either `method` or `action`. If both are present, they must agree.
- Create, update, and delete require `name`; create also requires `color`.
- Update requires at least one of `new_name`, `color`, or `description`.

### `manage_pull_request`

Omitting `pullNumber` creates a pull request and requires `title`, `head`, and
`base`. Providing `pullNumber` updates a pull request and requires at least one
change among title, body, state, base, draft state, maintainer-edit permission,
or reviewers.

`reviewers` accepts GitHub usernames and `ORG/team-slug` team identifiers.
`draft: true` converts an existing pull request to draft; `draft: false` marks
it ready for review. `maintainer_can_modify` is the preferred field, while
`maintainerCanModify` remains accepted; if both are supplied, they must agree.

### `review_pull_request`

Supply either `method` or the existing `action`, never both.

- Existing actions submit `APPROVE`, `REQUEST_CHANGES`, or `COMMENT` reviews,
  or request user/team reviewers.
- `create` requires `pullNumber`; omitting `event` creates a pending review.
  Providing `event` submits it immediately.
- `submit_pending` requires `pullNumber` and `event`; `delete_pending`
  requires `pullNumber`.
- `resolve_thread` and `unresolve_thread` require the GraphQL `threadId`
  returned by `pull_request_read` with `method: "get_review_comments"`.
- `add_comment_to_pending_review` requires `pullNumber`, `path`, `body`, and
  `subjectType`. A `FILE` comment omits all line fields. A `LINE` comment
  requires positive `line` and `side`; a range additionally requires
  `startLine` and `startSide`, with matching sides and `startLine < line`.
- `add_reply_to_pull_request_comment` requires a numeric `commentId` and at
  least one of `body` or `reaction`. A text reply also requires `pullNumber`;
  a reaction-only call can use the comment ID alone.

## Authentication

GitHub supports several authentication methods for API access:

### 1. Personal Access Tokens (PATs)

Personal Access Tokens are preferred over passwords and provide granular control over permissions, enabling developers to create tokens that allow only specific actions. There are two types:

- **Fine-grained PATs** (recommended): Allow selecting specific repositories and precise permissions. Generated under **Settings > Developer settings > Personal access tokens > Fine-grained tokens**.
- **Classic PATs**: Use OAuth scopes for permission control. Generated under **Settings > Developer settings > Personal access tokens > Tokens (classic)**.

Tokens are passed via the `Authorization` header:

```
Authorization: Bearer <YOUR-TOKEN>
```

### 2. OAuth 2.0 (OAuth Apps)

Every registered OAuth app is assigned a unique Client ID and Client Secret. The client secret is used to get an access token for the signed-in user.

- **Authorization endpoint:** `https://github.com/login/oauth/authorize`
- **Token endpoint:** `https://github.com/login/oauth/access_token`
- **Flow:** Standard OAuth 2.0 Authorization Code flow. After a successful app authentication, GitHub provides a temporary code value, which must be POSTed back to GitHub with the client secret in exchange for an access token.

**Available OAuth Scopes:**

| Scope                                                  | Description                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `(no scope)`                                           | Read-only access to public information                                      |
| `repo`                                                 | Full access to public and private repositories                              |
| `repo:status`                                          | Read/write access to commit statuses                                        |
| `public_repo`                                          | Access to public repositories only                                          |
| `admin:org`                                            | Full management of organizations and teams                                  |
| `write:org` / `read:org`                               | Write or read access to organization membership                             |
| `admin:repo_hook`                                      | Full access to repository webhooks                                          |
| `admin:org_hook`                                       | Full access to organization webhooks                                        |
| `user`                                                 | Read/write access to user profile (includes `user:email` and `user:follow`) |
| `user:email`                                           | Read access to email addresses                                              |
| `gist`                                                 | Write access to gists                                                       |
| `notifications`                                        | Access to notifications                                                     |
| `workflow`                                             | Manage GitHub Actions workflow files                                        |
| `write:packages` / `read:packages` / `delete:packages` | Manage GitHub Packages                                                      |
| `project` / `read:project`                             | Access to user and organization projects                                    |
| `delete_repo`                                          | Delete repositories                                                         |
| `codespace`                                            | Create and manage codespaces                                                |
| `security_events`                                      | Access to code scanning API                                                 |
| `read:audit_log`                                       | Read audit log data                                                         |

### 3. GitHub Apps

GitHub Apps authentication allows third-party applications to act on behalf of a user or organization, involving creating a GitHub App, installing it on a user or organization's account, and authenticating requests using a private key.

- **Authentication as the app:** Generate a JSON Web Token (JWT) signed with the app's private key, then use it to obtain an installation access token.
- **Authentication on behalf of a user:** Uses an OAuth-like flow to obtain a user access token.
- GitHub Apps use fine-grained permissions instead of scopes, which give you more control over what your app can do.

### Base URL

All API requests are made to `https://api.github.com`.

## Features

### Repository Management

Create, read, update, and delete repositories. Manage repository settings including visibility (public/private), branch protection rules, collaborator access, deploy keys, and repository topics. Also supports forking, transferring ownership, and managing repository templates.

### Issues and Issue Tracking

Create and manage issues within repositories. Supports labels, milestones, assignees, and comments. Issues can be searched and filtered across repositories using a powerful search syntax.

### Pull Requests and Code Review

Create and manage pull requests including requesting reviewers, managing review comments, and merging. Supports diff and patch formats. Allows managing pull request reviews with approve, request-changes, and comment actions.

### Git Data

Low-level access to Git objects including blobs, trees, commits, refs, and tags. Allows reading and writing raw Git data in a repository.

### GitHub Actions and Workflows

Manage workflows, workflow runs, and artifacts. Trigger workflows, view run logs, and manage workflow secrets and variables. Also supports managing self-hosted runners.

### Organizations and Teams

Manage organization settings, memberships, teams, and team memberships. Control organization-level permissions, invitations, and outside collaborator access.

### Users and Profiles

Access and update user profile information, email addresses, SSH keys, GPG keys, and social accounts. View followers and following relationships.

### Projects

Create and manage GitHub Projects (the project board feature). Supports managing columns and cards for organizing issues and pull requests.

### Gists

Create, update, delete, and list gists (code snippets). Supports forking, starring, and commenting on gists.

### GitHub Packages

Publish, install, and manage packages. Supports multiple package ecosystems including npm, Maven, Docker, NuGet, and RubyGems.

### Code Search and Repository Search

Search across code, repositories, issues, pull requests, users, topics, and commits using GitHub's search syntax. Supports qualifiers for filtering results.

### Deployments and Environments

Using the Deployments REST API, you can build custom tooling that interacts with your server and a third-party app. Manage deployment statuses and environments for repositories.

### Checks and Commit Statuses

You can use the REST API to build GitHub Apps that run powerful checks against code changes in a repository. Create and manage check runs, check suites, and commit statuses for CI/CD integration.

### Content Management

Use the REST API to create, modify, and delete Base64 encoded content in a repository. Read and write files, directories, and symlinks within repositories.

### Notifications

Access and manage notification threads for watched repositories and subscriptions.

### Security and Code Scanning

Access code scanning alerts, secret scanning alerts, Dependabot alerts, and security advisories. Manage repository vulnerability settings.

### Codespaces

Create, manage, and delete cloud development environments. Configure machine types and manage secrets for codespaces.

### GraphQL API

In addition to the REST API, GitHub provides a GraphQL API (v4) that allows more flexible, efficient queries with the ability to request exactly the data needed in a single request.

## Events

The integration implements one automatically managed repository event source with
23 separate event triggers. Its setup, event catalog, permission requirements,
and output examples are documented in [Repository events](../README.md#repository-events).

### Configuration and lifecycle

Connection configuration is empty. Callback enablement starts automatic discovery,
including for portal-created instances. Discovery uses `GET /user/repos` with 100
repositories per page ordered by full name. Because the runtime starts every
15-minute rediscovery with a null page token and keeps no state between cycles,
conditional requests cannot reduce cost; discovery is bounded instead. The page
token is `{ page, probes }` and is validated: at most 10 pages (1,000 repositories)
are scanned per cycle, and at most 50 non-admin repositories per cycle are probed
with `GET /repos/{owner}/{repo}/hooks` for webhook access (custom roles). Admin
repositories (`permissions.admin`) are eligible without a probe; archived repositories
are skipped; non-admin repositories beyond the probe budget are skipped. Reaching
either limit logs a warning (`github_webhook_probe_limit`, `github_webhook_page_limit`).
Worst case per connection per cycle is 60 requests. Discovery deduplicates repository
IDs per page and preserves the next page token even when no repositories on a page
qualify. The runtime deduplicates stable targets across pages and connections.
Resource-level 403/404 responses are skipped; rate limits are recognised from GitHub's
`x-ratelimit-remaining`/`retry-after` headers (429, or 403 with those headers) and
propagate together with authentication errors and other service failures. Read access
does not prove fine-grained token write access; creation reports missing write
permissions. No manual target-selection or webhook configuration is exposed.

A target is identified by its normalized GitHub instance URL and immutable repository
ID. Registration resolves its current name and checks identity before creating an
active JSON hook with a random secret, TLS verification, and the exact event catalog.
Connections in the same tenant share the target. Cleanup uses the saved hook ID and
checks repository identity before deletion. A DELETE 404 is accepted only after an
authorized paginated hooks list confirms absence. Repository lookup 404 remains
retryable because it can indicate lost access to a private repository.

The companion hub changes rescan active automatic subscriptions every 15 minutes,
continue empty discovery pages, initialize cleanup with connection auth/config, and
keep provider cleanup failures retryable. Shared hooks remain until the last callback
is removed. No provider-specific behavior is added to the hub. Deploy those runtime
changes alongside this integration for lifecycle behavior; SDK tests alone do not
prove deployed runtime cleanup or delivery.

### Event contract

Every trigger exposes `{ deliveryId, event, action, payload }`. The event name
matches GitHub's header, action is a string or `null`, and payload is the complete
GitHub JSON object. Typed resource schemas preserve additional fields, including
nested fields. Mapping uses the delivery snapshot without authenticated lookups.
The callback ID is the delivery ID; its type is `event.action` or `event` when
there is no action. A merge is `pull_request.closed` with
`payload.pull_request.merged === true`, not a separate action.

Incoming requests require POST, a valid SHA-256 signature over the original
body, a GUID delivery ID, a matching `X-GitHub-Hook-ID`, installation-target
headers naming the saved repository, and a payload `repository.id` equal to the
saved repository. Malformed or unauthenticated requests are rejected. Every rejected
or ignored delivery is logged with a reason code (`github_webhook_*`) and the event,
delivery, and hook headers; payloads and secrets are never logged. Valid pings and
unsupported event families are acknowledged without callbacks. Repeated deliveries
use the same idempotency key; GitHub does not supply a signed delivery timestamp.

Repository hooks support only `created`/`completed` check runs and `completed`
check suites. Repository creation across an organization cannot be observed by a
hook attached to an existing repository. Discussions and Dependabot depend on
repository feature availability. Unsupported events on older Enterprise versions
cause registration errors; coverage is never silently reduced.

### Verification

SDK contract tests live in the enterprise repository next to the live suite
(`tests/integrations/github/triggers*.test.ts`, run with `bun run triggers:test -- github`),
not in this package. They exercise all event families, payload preservation, request
verification, target discovery (including the page and probe limits), registration,
and cleanup. A second suite sweeps all 169 GitHub-recorded payload examples for the
23 implemented families, vendored verbatim from `octokit/webhooks` at a pinned commit
(`tests/integrations/github/__fixtures__/octokit-webhooks`), through verification, selection, and mapping
with deep equality. That repository is unmaintained and its successor
(`octokit/openapi-webhooks`) publishes GitHub's OpenAPI schemas rather than example
deliveries, so the examples are real but dated (last updated 2024-10); they prove the
schemas accept recorded shapes. A third suite covers the current contract: it checks
every event schema against a pinned structural skeleton of GitHub's OpenAPI webhook
description (`tests/integrations/github/__fixtures__/github-openapi-webhooks`, generated by
`scripts/github-webhook-schema-skeleton.ts` at the repo root) for all 114 operations
GitHub's description marks as deliverable to repository hooks (a per-event flag, so it
includes the app-only check actions the trigger descriptions exclude; checking them can
only make the schemas looser), asserting the schemas are never stricter than GitHub:
every field required here is required by GitHub, every null GitHub may send is
accepted, and every JSON type or enum value GitHub may send parses. Local negative
tests are needed because GitHub cannot
send intentionally forged signatures or invalid repository identities. Private live
coverage creates, reads back, and deletes a real hook on a disposable repository.
This lifecycle check uses a non-resolving receiver URL and does not claim to verify
end-to-end callback delivery.

Provider references: [repository webhook API](https://docs.github.com/en/rest/repos/webhooks),
[event payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads),
and [signature verification](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).
