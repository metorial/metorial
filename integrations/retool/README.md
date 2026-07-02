# <img src="https://provider-logos.metorial-cdn.com/retool.png" height="20"> Retool

Programmatically manage a Retool organization's users, groups, apps, permissions, and infrastructure. Create, list, update, and delete users and permission groups. Manage app lifecycle including creating, organizing, and deleting apps and folders. Configure SSO, data source resources, environments, and source control settings. Control access permissions for apps and folders. Monitor workflow executions and retrieve run details. Manage Spaces for multi-tenant setups, custom component libraries, app themes, observability providers, API access tokens, and usage analytics.

## Tools

### Create App

Create a new Retool application. Optionally place it in a specific folder.

### Create Group

Create a new permission group in the Retool organization. Groups control access to apps, resources, and workflows. You can optionally add initial members during creation.

### Create User

Create a new user in the Retool organization. Use this for programmatic user onboarding. The user will receive an invitation to set up their account.

### Delete App

Permanently delete a Retool application. This action cannot be undone.

### Delete Group

Delete a permission group from the Retool organization. This removes the group and all associated permissions.

### Delete User

Deactivate and remove a user from the Retool organization. This disables the user's access to the organization.

### Get Group

Retrieve detailed information about a specific permission group, including its members and access settings.

### Get Organization

Retrieve information about the current Retool organization, including its name, plan, and configuration details.

### Get Source Control Config

Retrieve the current source control configuration for the Retool organization. Shows the Git integration settings including repository URL and branch configuration.

### Get User

Retrieve detailed information about a specific Retool user by their ID. Optionally includes the groups the user belongs to.

### Get Workflow Run

Retrieve details of a specific workflow run, including its status, duration, and output. Useful for monitoring and debugging workflow executions.

### List Access Tokens

List all API access tokens configured for the Retool organization. Useful for auditing active API credentials.

### List Apps

List all Retool applications in the organization. Supports pagination for organizations with many apps.

### List Environments

List all environments (e.g., staging, production) configured in the Retool organization.

### List Folders

List all folders in the Retool organization. Folders are used to organize apps and resources.

### List Groups

List all permission groups in the Retool organization. Groups are the primary mechanism for assigning permissions to users.

### List Permissions

Query permissions in two ways: list all objects a user/group has access to, or list all users/groups that have access to a specific object.

### List Resources

List all data source resources (database connections, API configurations, etc.) in the Retool organization. Supports pagination.

### List Spaces

List all Spaces (isolated sub-environments) in the Retool organization. Spaces are useful for multi-tenant or multi-team setups.

### List Users

List users in the Retool organization with optional filtering by email, first name, or last name. Supports pagination for large user bases.

### List Workflows

List all workflows in the Retool organization. Workflows automate processes and can be triggered by schedules, webhooks, or other events.

### Manage Folder

Create, update, or delete a folder in the Retool organization. Folders organize apps and resources into a hierarchy.

### Manage Group Members

Add or remove users from a permission group. Use "add" to add one or more users, or "remove" to remove a single user from the group.

### Manage Permissions

Grant or revoke access permissions for users or groups on Retool objects (apps, folders, resources, workflows, agents). Supports access levels: **use**, **edit**, and **own**.

### Manage Space

Create, update, or delete a Space in the Retool organization. Spaces are isolated sub-environments for multi-tenant or multi-team setups.

### Manage User Attributes

Set or delete custom attributes (key-value metadata) on a Retool user. Use the "set" action to create or update an attribute, or "delete" to remove one.

### Update App

Update a Retool application's name or move it to a different folder. Only provide the fields you want to change.

### Update Group

Update a permission group's settings including name, universal access levels, and organizational permissions. Only provide the fields you want to change.

### Update User

Update a Retool user's properties such as name, email, active status, or metadata. Only provide the fields you want to change.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
