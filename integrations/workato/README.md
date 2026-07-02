# <img src="https://provider-logos.metorial-cdn.com/workato.png" height="20"> Workato

Manage automation recipes, connections, and deployments on the Workato iPaaS platform. Create, start, stop, and copy recipes. Create and manage connections to third-party applications. View job execution history and error details. Organize assets into projects and folders. Build and deploy projects across environments with review workflows. Export and import recipe packages for CI/CD migrations. Manage the API Platform including API collections, endpoints, and client access profiles. Perform CRUD operations on data tables and lookup tables. Publish and consume messages via event stream topics for pub/sub messaging. Manage AI agents with skills and knowledge bases. Invite and manage workspace collaborators with role-based access control. Configure environment properties, tags, audit logs, and secrets. Run test cases for recipes and retrieve results. Generate connector schemas from JSON/CSV samples.

## Tools

### Deploy Project

Build and deploy a Workato project to a target environment. This performs a one-step build-and-deploy operation. Use to promote project changes across environments (sandbox, test, stage, uat, preprod, prod).

### Export Package

Create an export manifest and export a package of workspace assets from a folder. Useful for CI/CD pipelines and migrating recipes between workspaces. Automatically generates the manifest and initiates the export.

### Get Recipe Versions

List all versions of a specific recipe. Each version includes the author, comment, version number, and timestamps. Useful for auditing recipe changes.

### Get Recipe

Retrieve detailed information about a specific Workato recipe including its code, configuration, connected applications, job counts, and version info.

### Get Workspace Info

Retrieve information about the current Workato workspace, including the workspace name, plan, recipe counts, billing period, and root folder ID.

### List Connections

List connections to third-party applications in the Workato workspace. Filter by folder, project, or update time. Returns connection metadata including authorization status.

### List Deployments

List project deployments in the Workato workspace. Filter by project, environment type, or deployment state. Returns deployment metadata and status.

### List Jobs

Retrieve job execution history for a specific recipe. Filter by status to see only succeeded, failed, or pending jobs. Returns aggregated counts and individual job metadata.

### List Projects

List all projects in the Workato workspace. Projects are top-level containers for organizing recipes, connections, and other assets.

### List Recipes

List automation recipes in the Workato workspace. Filter by folder, running state, or connected applications. Returns recipe metadata including name, status, trigger/action apps, and job counts.

### Manage API Endpoints

List API collections and endpoints in the Workato API Platform. Enable or disable individual API endpoints. Use to manage the lifecycle of APIs built on Workato.

### Manage Connection

Create, disconnect, or delete a connection to a third-party application. When creating, specify the provider name and optional credential inputs. Connections can be disconnected (revoked) or permanently deleted.

### Manage Data Table

List, create, or delete structured data tables in Workato. Also supports querying records, creating records, updating records, and deleting records within a data table.

### Manage Environment Properties

List or upsert workspace environment properties (key-value pairs). Properties are used for storing configuration values accessible across recipes, such as API URLs, feature flags, and environment-specific settings.

### Manage Event Topic

Create, update, list, or delete event stream topics. Topics are channels for pub/sub messaging between recipes and external systems. Also supports publishing and consuming messages.

### Manage Folder

Create, update, or delete folders within a Workato workspace. Folders organize recipes and connections within projects. Also supports listing folders within a parent.

### Manage Lookup Table

List lookup tables, create new ones, or manage rows within a lookup table. Lookup tables store reference data used in recipes (e.g. status code mappings, region configurations).

### Manage Recipe

Create, update, or delete a Workato recipe. When creating, provide a name and optionally recipe code and folder. When updating, provide the recipe ID and the fields to change. The recipe must be stopped to update it.

### Start/Stop Recipe

Start or stop a Workato recipe. Also supports copying a recipe to a different folder, resetting the trigger cursor, or updating a recipe's connection.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
