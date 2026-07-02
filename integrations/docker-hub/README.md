# <img src="https://provider-logos.metorial-cdn.com/docker.jpeg" height="20"> Docker Hub

Manage Docker container image repositories, tags, and organizations on Docker Hub. Create, list, update, and delete repositories and image tags. Search and discover public container images. Manage organization members, teams, repository-level permissions, immutable tag settings, webhooks, personal access tokens, organization access tokens, and audit logs.

## Tools

### List Audit Logs

Retrieve audit log events for a Docker Hub account (user or organization). Tracks actions like repository changes, team membership updates, and settings modifications. Available for Docker Team and Business subscriptions.

### List Audit Log Actions

List all available audit log action types for a Docker Hub account.

### Create Repository

Create a new Docker Hub repository under a namespace. Repositories can be public or private and are used to store and distribute Docker container images.

### Delete Repository

Permanently delete a Docker Hub repository and all of its tags and images. This action cannot be undone.

### Delete Image Tag

Delete a specific tag from a Docker Hub repository. This removes the tag reference but does not delete the underlying image layers if other tags reference them.

### Get Image Tag

Get details for a specific Docker Hub repository tag, including digest, size, last update time, and platform image metadata.

### Get Repository

Get detailed information about a specific Docker Hub repository, including its description, visibility, star/pull counts, and content types.

### List Repositories

List Docker image repositories under a namespace (user or organization). Returns repository metadata including visibility, star count, pull count, and last updated timestamp. Supports pagination for namespaces with many repositories.

### List Image Tags

List tags for a Docker Hub repository. Returns tag details including size, digest, last updated time, and platform information for multi-arch images. Supports pagination.

### List Access Tokens

List personal access tokens (PATs) for the authenticated Docker Hub user. Shows token labels, scopes, creation dates, and activity status.

### Create Access Token

Create a new personal access token (PAT) for Docker Hub.

### Get Access Token

Get metadata for a personal access token (PAT) by UUID. Docker Hub does not return the token secret after creation.

### Update Access Token

Update a personal access token's label or active status.

### Delete Access Token

Permanently delete a personal access token.

### List Organization Access Tokens

List Docker Hub organization access tokens (OATs) for an organization.

### Get Organization Access Token

Get details for a Docker Hub organization access token, including active status, expiration, and resource scopes.

### Create Organization Access Token

Create a Docker Hub organization access token (OAT) for automation.

### Update Organization Access Token

Update a Docker Hub organization access token's label, description, resources, or active status.

### Delete Organization Access Token

Permanently delete a Docker Hub organization access token.

### List Organization Members

List members of a Docker Hub organization, including their roles and team memberships. Supports pagination for large organizations.

### Update Organization Member Role

Update a Docker Hub organization member's role.

### Remove Organization Member

Remove a member from a Docker Hub organization.

### List Teams

List teams (groups) within a Docker Hub organization. Returns team names, descriptions, and member counts.

### Create Team

Create a new team within a Docker Hub organization.

### Delete Team

Delete a team from a Docker Hub organization.

### Manage Team Members

List, add, or remove members from a Docker Hub organization team.

### Assign Repository Team

Grant a Docker Hub organization team access to a repository with read, write, or admin permission.

### List Webhooks

List webhooks configured for a Docker Hub repository. Webhooks fire on image push events and can trigger actions in external services.

### Create Webhook

Create a webhook for a Docker Hub repository.

### Delete Webhook

Delete a webhook from a Docker Hub repository.

### Search Repositories

Search for public Docker Hub repositories by keyword. Discovers images for operating systems, frameworks, databases, and more from the Docker Hub content library.

### Update Repository

Update an existing Docker Hub repository's description, full description, or visibility. Only provided fields will be updated.

### Update Repository Immutable Tags

Update immutable tag settings for a Docker Hub repository.

### Verify Repository Immutable Tags

Validate an immutable tag regex rule for a Docker Hub repository and return repository tags that match the rule.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
