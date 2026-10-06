# Gitea integration

This integration provides 54 tools for repository search and lifecycle, branches,
files and commit history, issues and comments, pull requests and reviews,
releases, labels, milestones, wikis, organizations, teams, and collaborators.

## Authentication

Supply your Gitea instance URL, including an installation subpath when present.
Personal access tokens use the `token` authorization scheme. OAuth2 access tokens
use the `Bearer` scheme and are refreshed through the instance's token endpoint.
Register OAuth applications in the instance's application settings. Requested
permissions cover repository, issue, organization, and profile operations.
Granular OAuth permissions are available starting with Gitea 1.23.

## Common workflows

- Identify your account with `get_current_user`, then discover repository names
  with `search_repos`. Owner filters and pagination are applied by the server.
- Download a file with `download_file`. Its blob SHA can be used with
  `create_or_update_file` or `delete_file`. Upload contents as base64. Existing
  `get_file_content` calls remain supported but are deprecated.
- Create a branch and pull request, submit reviews, and merge with the repository's
  supported merge method. Assignees and reviewers are distinct. Use `headCommitId`
  when a merge must match the head commit you reviewed.
- Track issues with comments, labels, milestones, and due dates. Setting an
  issue's `milestoneId` to zero removes its milestone. Repository issue sorting
  is not supported by the provider API; omit the legacy `sort` input.
- Manage organizations and teams. The Owners team is managed by Gitea; create
  ordinary teams with read, write, or admin permissions. `unitsMap` configures
  permissions per repository feature. Organization deletion requires its
  repositories and packages to have been removed first.

## Instance compatibility

The request contracts were checked against the official Gitea 1.26 API and the
current API reference. Features can be disabled by an instance administrator,
and older installations may lack newer merge methods or per-feature team
permissions. Page limits are controlled by the server. Check your instance's
`/swagger.v1.json` for its supported routes and fields.

Official references: [API usage](https://docs.gitea.com/development/api-usage/),
[OAuth2 provider](https://docs.gitea.com/development/oauth2-provider/),
[API reference](https://docs.gitea.com/api/), and
[Gitea 1.26 reference](https://docs.gitea.com/api/1.26/).
