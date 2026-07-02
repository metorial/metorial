# <img src="https://provider-logos.metorial-cdn.com/terraform-cloud.png" height="20"> Terraform Cloud

Manage infrastructure-as-code workflows on Terraform Cloud (HCP Terraform). Create, update, delete, lock, and unlock workspaces. Trigger and manage Terraform runs including plan, apply, and destroy operations. Approve, cancel, discard, or force-execute runs. Create and manage Terraform variables and environment variables at the workspace or variable set level, including sensitive values. Organize workspaces into projects. Manage organizations, teams, team memberships, and granular workspace permissions. Enforce policies using Sentinel and OPA policy-as-code frameworks. View and manage Terraform state versions and outputs. Connect workspaces to VCS repositories (GitHub, GitLab, Bitbucket, Azure DevOps) for automatic run triggers. Configure run tasks to integrate external services during plan and apply stages. Set up run triggers for workspace dependency chains. Enable health assessments including drift detection and continuous validation. Publish and manage private Terraform modules and providers in a private registry. Manage agent pools for private infrastructure execution. Access audit trail logs. Configure webhook notifications for run progress, workspace health, and auto-destroy events to Slack, Microsoft Teams, email, or custom endpoints.

## Tools

### Create Run

Trigger a new Terraform run (plan, apply, or destroy) in a workspace. Supports plan-only, refresh-only, destroy runs, targeted resources, and resource replacement. For VCS-connected workspaces, uses the latest configuration; for API-driven workspaces, optionally specify a configuration version.

### Create Variable

Create a Terraform variable or environment variable in a workspace. Supports HCL-formatted values and marking variables as sensitive to protect secrets.

### Create Workspace

Create a new Terraform workspace. Configure execution mode, Terraform version, auto-apply behavior, and optionally connect to a VCS repository for automatic run triggers.

### Delete Variable

Permanently delete a variable from a workspace. This removes the variable from both the workspace and any future runs.

### Delete Workspace

Permanently delete a workspace and all of its content (state versions, runs, variables). This action cannot be undone.

### Get Organization

Get details about the configured Terraform Cloud organization, including plan entitlements, feature flags, and usage limits.

### Get Run

Get detailed information about a specific Terraform run. Returns the run's current status, plan/apply details, timestamps, and whether it has changes.

### List State Versions

List historical state versions for a workspace. Each state version represents a snapshot of the infrastructure state at a point in time.

### Get Workspace

Get detailed information about a specific workspace by its ID or name. Returns full workspace configuration including execution mode, Terraform version, VCS settings, lock status, and resource count.

### List Runs

List Terraform runs for a workspace. Filter by status to find pending, planning, applying, or completed runs. Returns run details including status, changes, and timing information.

### List Variables

List all Terraform and environment variables in a workspace. Returns the key, value, category, and whether each variable is sensitive or uses HCL syntax. Sensitive variable values are not returned.

### List Workspaces

List workspaces in the organization. Supports searching by name and filtering by project. Returns workspace configuration including execution mode, Terraform version, lock status, and VCS connection.

### Lock/Unlock Workspace

Lock or unlock a workspace. Locking prevents new runs from being queued. Supports regular unlock and force-unlock (requires admin access). Provide a reason when locking to document why the workspace is locked.

### List Notifications

List all notification configurations for a workspace. Shows webhook, Slack, Microsoft Teams, and email notification destinations and the events they listen for.

### List Policy Sets

List policy sets configured in the organization. Policy sets contain Sentinel or OPA policies that are enforced on runs.

### List Projects

List all projects in the organization. Projects are used to organize and group workspaces.

### List Run Triggers

List run triggers (workspace dependencies) for a workspace. Run triggers automatically queue runs when dependent workspaces complete successfully.

### Manage Run

Perform an action on an existing Terraform run. Apply a planned run, discard an unapplied plan, cancel a running operation, force-cancel a stuck run, or force-execute a run that is waiting in the queue.

### List Teams

List all teams in the organization. Returns team details including member count, visibility, and organization-level access permissions.

### List Variable Sets

List all variable sets in the organization. Variable sets allow sharing common variables across multiple workspaces without duplicating them.

### Update Variable

Update an existing variable's key, value, description, HCL setting, or sensitivity. Only provided fields will be updated.

### Update Workspace

Update an existing workspace's settings. Modify name, description, execution mode, Terraform version, auto-apply behavior, or working directory. Only provided fields will be updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
