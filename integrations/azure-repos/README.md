# <img src="https://provider-logos.metorial-cdn.com/azure-repos.png" height="20"> Azure Repos

Manage Git repositories, branches, and pull requests in Azure DevOps. Create, list, update, and delete repositories and forks. Create and manage branches, configure branch policies (minimum reviewers, build validation, merge strategies). Create, review, comment on, and complete pull requests with support for draft PRs, auto-completion, and merge strategies. Browse commit history, view pushes, and retrieve file contents at specific versions. Search code across repositories by text, path, and file extension. Receive webhooks for code pushes, pull request lifecycle events, repository creation/deletion/renaming, and TFVC check-ins.

## Tools

### Comment on Pull Request

Adds a comment to a pull request. Supports general comments, inline code comments on specific files/lines, replying to existing threads, and updating thread status (active, fixed, closed, etc.).

### Create Pull Request

Creates a new pull request in a repository. Supports draft PRs, auto-complete with configurable merge strategies, and initial reviewer assignment.

### Get File Content

Retrieves the content of a file from a repository at a specific version (branch, tag, or commit). Can also list files/folders at a given path.

### Get Pull Request

Gets detailed information about a specific pull request, including reviewers, vote status, completion options, labels, and comment threads.

### List Branches

Lists branches (Git refs) in a repository. Optionally filter to a specific prefix. Can also include branch statistics like ahead/behind counts relative to a base branch.

### List Commits

Lists commits in a repository with filtering by branch, author, date range, and file path. Returns commit metadata including author, message, and change counts.

### List Pull Requests

Lists pull requests in a repository with filtering by status, creator, reviewer, and branches. Returns PR metadata including title, status, reviewers, and merge info.

### List Repositories

Lists all Git repositories in the configured Azure DevOps project. Returns repository metadata including name, default branch, size, fork status, and URLs.

### Create Branch

Creates a new branch in a repository from a specified source commit SHA. The source commit is typically the HEAD of an existing branch.

### Create Repository

Creates a new Git repository in the Azure DevOps project. Optionally creates a fork of an existing repository by specifying a parent repository.

### Search Code

Searches for code across repositories in the project. Supports filtering by repository, branch, file path, and file extension. Returns matching file paths with match locations.

### Update Pull Request

Updates a pull request's properties. Can change title, description, status (complete/abandon/reactivate), draft state, target branch, and auto-complete settings. Also supports adding/removing reviewers and voting.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
