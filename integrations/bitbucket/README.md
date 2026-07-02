# <img src="https://provider-logos.metorial-cdn.com/bitbucket.svg" height="20"> Bitbucket

Manage Git repositories, pull requests, and CI/CD pipelines on Bitbucket Cloud. Create, fork, and configure repositories within workspaces and projects. Create, review, approve, merge, and decline pull requests with inline code comments. Browse source code, list commits, and manage branches and tags. Track issues with the built-in issue tracker. Trigger, monitor, and manage Bitbucket Pipelines. List workspace members, configure repository default reviewers and branch restrictions, create and manage repository webhooks, and search code across repositories.

## Tools

### Browse Source

Browse repository source files at a specific revision (branch, tag, or commit hash). Returns directory listings or file contents depending on the path.

### Comment on Issue

Add a comment to an issue in the repository's built-in issue tracker.

### Comment on Pull Request

Add a comment to a pull request. Supports general comments and inline code comments on specific files and lines. For inline comments, provide the file path and line number. For multi-line comments, provide both fromLine and toLine.

### Create Commit Status

Create or update a build status on a specific commit. Typically used by CI/CD tools to report build results. The **key** uniquely identifies the status — updating with the same key replaces the previous status.

### Create Issue

Create a new issue in a repository's built-in issue tracker. Set title, content, priority, kind, component, milestone, version, and assignee.

### Create Pull Request

Create a new pull request to merge changes from a source branch into a destination branch. Supports setting title, description, reviewers, and close-source-branch option.

### Create Repository

Create a new Git repository in the configured workspace. Supports setting privacy, project assignment, fork policy, language, and description.

### Delete Repository

Permanently delete a repository from the workspace. This action is **irreversible** and removes all repository data including branches, commits, pull requests, and issues.

### Fork Repository

Fork an existing repository. The fork is created in the same workspace by default, or in a specified target workspace.

### Get Pull Request

Retrieve detailed information about a specific pull request including its description, reviewers, merge details, and comments summary.

### Get Repository

Retrieve detailed information about a specific repository including its settings, main branch, project, and links.

### List Commits

List commits in a repository, optionally filtered by branch. Returns commit hashes, messages, authors, and dates.

### List Issues

List issues from a repository's built-in issue tracker. Filter using Bitbucket's query language for status, priority, assignee, and more.

### List Pull Requests

List pull requests for a repository. Filter by state (OPEN, MERGED, DECLINED, SUPERSEDED) to find specific PRs.

### List Repositories

List repositories in the configured workspace. Supports filtering by query and pagination. Use the **query** parameter for Bitbucket's query language filtering (e.g. \

### List Workspace Members

List all members in the configured workspace. Returns user display names, UUIDs, and account IDs.

### Manage Branch Restrictions

List, get, create, update, or delete repository branch restriction rules for push restrictions and merge checks.

### Manage Branches

List, create, or delete branches in a repository. Use action "list" to browse branches, "create" to create a new branch from a target commit/branch, or "delete" to remove a branch.

### Manage Default Reviewers

List, get, add, or remove default reviewers that are automatically added to newly created pull requests.

### Manage Pipelines

List, get, trigger, or stop Bitbucket Pipelines. - **list**: View recent pipelines and their statuses. - **get**: Get details of a specific pipeline including steps. - **trigger**: Start a new pipeline on a branch, tag, or custom pattern. - **stop**: Stop a running pipeline.

### Manage Projects

List, create, update, or delete projects in the workspace. Projects organize repositories into logical groups. Use action "list" to browse, "create"/"update" to manage, or "delete" to remove.

### Manage Pull Request

Perform actions on a pull request: **approve**, **unapprove**, **merge**, **decline**, **request_changes**, or **remove_change_request**. Use "merge" with optional merge strategy and close-source-branch settings.

### Manage Tags

List, create, or delete tags in a repository. Use action "list" to browse tags, "create" to create a new tag at a specific commit, or "delete" to remove a tag.

### Manage Webhooks

List, get, create, update, or delete repository webhooks for Bitbucket events such as pushes, pull request changes, issue changes, and build status changes.

### Search Code

Search for code across repositories in the workspace. Returns matching file paths and code snippets.

### Update Issue

Update an existing issue's fields including title, content, status, priority, kind, assignee, component, milestone, and version.

### Update Repository

Update repository settings such as name, description, privacy, language, fork policy, project assignment, and issue/wiki toggles.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
