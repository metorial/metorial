# <img src="https://provider-logos.metorial-cdn.com/github.png" height="20"> Github

Manage repositories, issues, and pull requests. Create and configure branches, star repositories, review code, and merge changes. Automate CI/CD workflows with GitHub Actions, manage workflow runs, secrets, and artifacts. Track issues with labels, milestones, and assignees. Search across code, repositories, issues, and users. Manage organizations, teams, and memberships. Create and manage projects, gists, packages, deployments, and environments. Access security alerts including code scanning, secret scanning, and Dependabot alerts. Read and write file contents in repositories. Manage webhooks, notifications, and codespaces.

## Tools

### Comment on Issue

Add a comment to an existing issue or pull request. Both issues and pull requests share the same comment API.

### Create Commit Status

Create a status check on a specific commit. Useful for integrating CI/CD results, deployment status, or other external checks. Also supports reading the combined status of all checks for a given ref.

### Create Release

Create a new release for a GitHub repository with a tag, name, release notes, and draft/pre-release options. Can automatically generate release notes from commits since the last release.

### Create Repository

Create a new GitHub repository for the authenticated user or within an organization. Supports initializing with a README, gitignore template, and license.

### Get Issue

Retrieve detailed information about a specific issue, including its body, comments count, labels, assignees, and milestone.

### Get Repository

Retrieve detailed information about a GitHub repository including its settings, statistics, and metadata. Use this to inspect a repository's configuration, check its visibility, default branch, language, star/fork counts, and more.

### Get User

Retrieve a GitHub user's profile. Provide a username to look up any user, or omit it to get the authenticated user's profile.

### Star Repository

Star or unstar a GitHub repository for the authenticated user.

### List Branches

List branches in a GitHub repository with optional filtering for protected branches.

### List Commits

List commits on a repository branch with filtering by SHA, path, author, or date range.

### List Issues

List issues in a GitHub repository with filtering and sorting options. Filter by state, labels, assignee, milestone, and since date. Note: GitHub's API returns pull requests alongside issues — this tool filters them out.

### List Pull Requests

List pull requests in a GitHub repository with filtering by state, head/base branch, and sorting options.

### List Repositories

List repositories for the authenticated user or a specific organization. Supports filtering by type, sorting, and pagination.

### Manage Collaborators

List, add, or remove collaborators on a GitHub repository. Control access permissions for individual users.

### Manage File Content

Read, create, update, or delete a file in a GitHub repository. - **read**: Retrieve file contents (decoded from Base64). - **write**: Create or update a file. Provide Base64-encoded content and a commit message. - **delete**: Delete a file. Requires the file's current SHA and a commit message.

### Manage Gist

Create, read, update, or delete GitHub Gists (code snippets). - **create**: Create a new gist with one or more files. - **get**: Retrieve a gist by ID. - **update**: Update a gist's description or files. - **delete**: Delete a gist. - **list**: List gists for the authenticated user.

### Manage Issue

Create a new issue or update an existing one in a GitHub repository. When creating: provide title and optionally body, labels, assignees, and milestone. When updating: provide the issue number along with fields to change (title, body, state, labels, assignees).

### Manage Labels

List existing labels or create a new label in a GitHub repository. Labels can be applied to issues and pull requests for categorization.

### Manage Pull Request

Create a new pull request or update an existing one. When creating: provide head branch, base branch, and title. When updating: provide the pull request number along with fields to change.

### Manage Workflow

Interact with GitHub Actions workflows: list workflows, list runs, trigger a workflow dispatch, cancel or rerun a workflow run, and view run jobs.

### Merge Pull Request

Merge a pull request using the specified merge method (merge commit, squash, or rebase).

### Review Pull Request

Submit a review on a pull request with an approve, request changes, or comment action. Optionally include inline comments on specific files and lines. Can also request reviewers.

### Search GitHub

Search across GitHub for repositories, code, issues/pull requests, or users using GitHub's search syntax. Supports qualifiers for filtering (e.g., "language:python stars:>100" for repositories).

### Update Repository

Update settings of an existing GitHub repository. Modify name, description, visibility, feature toggles (issues, wiki, projects), default branch, and archive status.

## Repository events

Enable callbacks on a connection to set up repository events automatically, including
connections created through a portal. There are no repository settings to fill in.
Discovery pages through repositories visible to the connection and checks webhook
access for each one. Personal and organization repositories are supported on
GitHub.com and the GitHub Enterprise instance selected during authentication.
Connections in the same tenant share a repository webhook.

The account must be able to manage repository webhooks (repository admin or a
custom role granting webhook management). OAuth and classic personal access tokens
need `admin:repo_hook` (or a scope granting equivalent access, such as `repo`) plus
repository access. Fine-grained tokens need **Webhooks: read and write**. Organization
policies, SSO authorization, and the token's repository selection still apply.
No OAuth scopes are added automatically.

Discovery is bounded so it stays well inside GitHub's API rate limits: each scan
reads up to 1,000 repositories (10 pages of 100, ordered by full name). Repositories
where the account is an admin are eligible without extra requests; archived
repositories are skipped. Repositories where the account is not an admin are checked
for webhook access (custom roles), at most 50 per scan; further non-admin repositories
are skipped and a warning is logged. Repositories that deny webhook access are skipped.
Rate limits (detected from GitHub's rate-limit headers), invalid credentials, and
service failures are surfaced. The read-only access check cannot distinguish a
fine-grained token with only webhook read permission from one with write permission;
GitHub validates write access during hook creation and any failure is reported.

The callback runtime rescans active connections every 15 minutes for repositories
created or authorized later. Removing the last callback using a repository removes
its hook with connection credentials; failed cleanup remains retryable.

### Supported events

| Area | Event names |
| --- | --- |
| Code and repositories | `push`, `create`, `delete`, `repository`, `fork`, `star` |
| Issues and collaboration | `issues`, `issue_comment`, `pull_request`, `pull_request_review`, `pull_request_review_comment`, `pull_request_review_thread`, `discussion`, `discussion_comment` |
| CI and checks | `workflow_run`, `workflow_job`, `check_run`, `check_suite`, `status` |
| Delivery | `release`, `deployment`, `deployment_status` |
| Security | `dependabot_alert` |

Each event has a separate trigger. Repository hooks receive `created` and
`completed` check-run actions and only `completed` check-suite actions. A merged
pull request has action `closed` and `payload.pull_request.merged: true`.
`issue_comment` includes conversation comments on both issues and pull requests;
`pull_request_review_comment` covers comments on a diff. Branch and tag deletions
can have no head commit. Discussions and Dependabot events require those features
to be available and enabled. Older Enterprise versions may not support every
event; unsupported registration is reported rather than reducing coverage.

### Event output

Every callback contains `deliveryId`, `event`, `action` (or `null` when absent),
and the complete GitHub `payload`, including additional and nested provider
fields. For example, an issue update has this shape (payload abbreviated):

```json
{
  "deliveryId": "72d3162e-cc78-11e3-81ab-4c9367dc0958",
  "event": "issues",
  "action": "edited",
  "payload": {
    "action": "edited",
    "repository": { "id": 42, "full_name": "octocat/hello-world" },
    "issue": { "id": 101, "number": 1, "title": "Updated title" },
    "changes": { "title": { "from": "Original title" } }
  }
}
```

The callback ID is the delivery ID. Its type is the event name plus action
(`issues.edited`), or just the event name (`push`). SHA-256 signatures and saved
repository/hook identities (hook ID and installation-target headers, repository ID
in the payload) are checked before events are accepted. Rejected or ignored
deliveries are logged with a reason code and delivery headers only, never the
payload or secret. Valid pings are acknowledged without callbacks. Redeliveries
retain their delivery IDs.

See [GitHub's event reference](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
for provider payloads and event availability.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
