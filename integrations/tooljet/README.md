# <img src="https://provider-logos.metorial-cdn.com/tooljet.png" height="20"> Tooljet

Manage users, workspaces, and applications on a ToolJet low-code platform instance. List, create, and update users with workspace assignments and group memberships. Retrieve workspace information and manage user-workspace relationships. Export and import applications between workspaces or instances, including pages, queries, data sources, and ToolJet Database data. Trigger workflow automations via webhooks with custom parameters.

## Tools

### Create User

Create a new user on the ToolJet instance with name, email, optional password, and workspace assignments including group memberships.

### Export App

Export a ToolJet application from a workspace as JSON. The export includes pages, queries, data sources, environments, versions, and metadata. Optionally include ToolJet Database data or export specific/all versions.

### Get User

Look up a specific user by their UUID or email address. Returns the user's details including workspace memberships and group assignments.

### Import App

Import a ToolJet application JSON into a workspace. The import data should be the JSON previously exported from a ToolJet instance. Optionally specify a custom app name to override the original.

### List Apps

List all applications in a specific workspace, including their available versions.

### List Users

List all users on the ToolJet instance with their workspace permissions and group memberships. Optionally filter by group names.

### List Workspaces

Retrieve all workspaces on the ToolJet instance, including their status and available groups.

### Manage User Workspaces

Replace all workspace relations for a user or update a single workspace relation. Use **replaceAll** mode to set the complete list of workspace assignments (an empty array removes all). Use **updateOne** mode to update a specific workspace relation including status and group assignments.

### Trigger Workflow

Trigger a ToolJet workflow via its webhook endpoint. Each workflow has its own unique ID and bearer token found in the workflow's Triggers tab. Parameters can be passed via the request body.

### Update User Role

Update a user's role within a specific workspace. Common roles include "admin", "builder", and "end-user".

### Update User

Update an existing user's details such as name, email, password, or status. Identify the user by UUID or email address.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
