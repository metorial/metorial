# <img src="https://provider-logos.metorial-cdn.com/appsmith.png" height="20"> Appsmith

Manage and interact with Appsmith, an open-source low-code platform for building internal tools and dashboards. Trigger workflow automations via webhook URLs, monitor instance health, and manage applications and workspaces. Import and export applications as JSON, connect to datasources, embed apps in external sites, and retrieve audit logs. Note: most management operations rely on internal session-based APIs rather than a formally documented public API, so programmatic capabilities are limited. Key actions include triggering workflows with HTTP POST requests, checking instance health status, exporting and importing applications, managing workspace users and roles, and querying audit logs for user and application events.

## Tools

### Check Instance Health

Check whether an Appsmith instance is operational. This endpoint does not require authentication and can be used to monitor self-hosted instances.

### Export Application

Export an Appsmith application as a JSON object. The exported JSON contains the full application definition including pages, queries, JS objects, and widget configurations. Datasource credentials are excluded for security.

### Get Current User

Retrieve the profile of the currently authenticated user, including their name, email, and role information.

### Get Instance Info

Retrieve configuration and feature information about an Appsmith instance, including feature flags, license plan, and available authentication providers. This unauthenticated endpoint is useful for monitoring instance configuration.

### Import Application

Import an Appsmith application into a workspace from a JSON definition. The JSON should be in the format produced by the export application tool. Datasource credentials must be reconfigured after import.

### List Applications

List all applications in a given workspace. Applications are the main building blocks in Appsmith, containing pages, datasources, queries, and JS objects.

### List Datasources

List all datasources configured in a workspace. Datasources represent connections to databases (PostgreSQL, MySQL, MongoDB, etc.) and APIs (REST, GraphQL) used by applications. Credentials are never exposed.

### List Pages

List all pages in an Appsmith application. Pages are the main navigational units within an application, each containing widgets, queries, and JS objects.

### List Workspaces

List all workspaces accessible to the authenticated user. Workspaces are the organizational unit in Appsmith that group applications, datasources, and users together.

### Manage Application

Create, update, delete, publish, clone, or fork an Appsmith application. Provides full lifecycle management for applications within workspaces.

### Manage Workspace

Create, update, or delete an Appsmith workspace. Can also retrieve workspace details and members. To create a workspace, provide a name. To update or delete, provide the workspace ID.

### Query Audit Logs

Query audit logs from an Appsmith instance. Audit logs record notable events including application CRUD, user login/signup, query executions, datasource changes, and configuration updates. **Requires Business or Enterprise edition.**

### Trigger Workflow

Trigger an Appsmith workflow by sending a POST request to its webhook URL. The workflow receives the provided JSON payload as input parameters and may return a response. Requires Business or Enterprise edition.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
