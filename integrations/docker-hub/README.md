# <img src="https://provider-logos.metorial-cdn.com/docker.jpeg" height="20"> Docker Hub

Manage Docker container image repositories, tags, and organizations on Docker Hub. Create, list, update, and delete repositories and image tags. Search and discover public container images. Manage organization members, teams, and repository-level permissions. Create and manage webhooks for image push events. Handle personal and organization access tokens programmatically. View audit logs for organization and repository activity. Provision and de-provision users via SCIM. Categorize repositories for improved discoverability.

## Tools

### List Audit Logs

Retrieve audit log events for a Docker Hub account (user or organization). Tracks actions like repository changes, team membership updates, and settings modifications. Available for Docker Team and Business subscriptions.

### Create Repository

Create a new Docker Hub repository under a namespace. Repositories can be public or private and are used to store and distribute Docker container images.

### Delete Repository

Permanently delete a Docker Hub repository and all of its tags and images. This action cannot be undone.

### Delete Image Tag

Delete a specific tag from a Docker Hub repository. This removes the tag reference but does not delete the underlying image layers if other tags reference them.

### Get Repository

Get detailed information about a specific Docker Hub repository, including its description, visibility, star/pull counts, and content types.

### List Repositories

List Docker image repositories under a namespace (user or organization). Returns repository metadata including visibility, star count, pull count, and last updated timestamp. Supports pagination for namespaces with many repositories.

### List Image Tags

List tags for a Docker Hub repository. Returns tag details including size, digest, last updated time, and platform information for multi-arch images. Supports pagination.

### List Access Tokens

List personal access tokens (PATs) for the authenticated Docker Hub user. Shows token labels, scopes, creation dates, and activity status.

### List Organization Members

List members of a Docker Hub organization, including their roles and team memberships. Supports pagination for large organizations.

### List Teams

List teams (groups) within a Docker Hub organization. Returns team names, descriptions, and member counts.

### List Webhooks

List webhooks configured for a Docker Hub repository. Webhooks fire on image push events and can trigger actions in external services.

### Search Repositories

Search for public Docker Hub repositories by keyword. Discovers images for operating systems, frameworks, databases, and more from the Docker Hub content library.

### Update Repository

Update an existing Docker Hub repository's description, full description, or visibility. Only provided fields will be updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
