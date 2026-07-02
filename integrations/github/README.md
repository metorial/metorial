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

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
