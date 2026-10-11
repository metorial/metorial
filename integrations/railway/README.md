# <img src="https://provider-logos.metorial-cdn.com/railway.png" height="20"> Railway

Deploy and manage web applications, databases, and infrastructure on Railway's cloud platform. Create and configure projects, services, environments, and deployments. Manage environment variables, custom domains, persistent storage volumes, and database services (PostgreSQL, MySQL, MongoDB, Redis).

## Tools

### Get Current User

Identify the connected credentials. Returns the user profile for account and OAuth tokens, the accessible workspaces (for use with List Projects and Create Project), and the project and environment for project tokens.

### Get Project

Retrieve detailed information about a Railway project including its services and environments.

### List Projects

List Railway projects accessible to the authenticated user, with cursor pagination. Optionally filter by workspace. Returns project names, descriptions, and timestamps.

### List Deployments

List deployments for a service in a specific environment. Returns deployment status, URLs, and timestamps. Use this to check deployment history and current status.

### Redeploy Deployment

Redeploy an existing deployment and return the new deployment Railway created, optionally reusing the same image tag for image-based services.

### Get Domains

List all domains (both Railway-provided and custom) for a service in a specific environment. Includes DNS record status for custom domains.

### List Environments

List all environments in a Railway project (e.g., production, staging). Each environment maintains its own variables, domains, and deployment configurations.

### Create Project

Create a new Railway project. Optionally assign it to a workspace and set a description.

### Get Service

Retrieve detailed information about a Railway service, including its environment-specific configuration (build settings, deploy settings, replicas, etc.) when an environment ID is provided.

### Get Variables

Retrieve environment variables for a project and environment. Optionally filter by service to get service-specific variables. Returns the rendered (resolved) variable values.

### List Volumes

List all persistent storage volumes in a Railway project. Provide an environment ID to also list that environment's volume instances.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
