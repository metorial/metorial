# <img src="https://provider-logos.metorial-cdn.com/n8n.png" height="20"> N8n

Manage workflows, executions, credentials, users, and projects on an n8n workflow automation instance. Create, update, activate, deactivate, and delete workflows programmatically. List and retrieve execution history, retry failed executions, and filter by status or date range. Create and manage credentials for external service authentication, including retrieving credential schemas. Organize resources with tags and variables. Manage projects for access control. Pull and push workflow changes via source control integration with Git. Generate security audit reports for the instance.

## Tools

### Activate Workflow

Activate (publish) or deactivate a workflow. Activating makes the workflow live and able to receive trigger events. Optionally activate a specific historical version by providing a version ID.

### Create Credential

Create a new credential in n8n. Use the **Get Credential Schema** tool first to understand the required fields for a given credential type.

### Create Workflow

Create a new workflow in n8n. Provide the workflow name, nodes, connections, and optional settings. The workflow is created in an inactive state by default.

### Delete Credential

Permanently delete a credential from n8n. Workflows using this credential will no longer be able to authenticate. This action cannot be undone.

### Delete Execution

Permanently delete a workflow execution record. This action cannot be undone.

### Delete Workflow

Permanently delete a workflow from n8n. This action cannot be undone.

### Generate Security Audit

Generate a security audit report for your n8n instance. The report covers risk categories including credentials, database, nodes, filesystem, and instance-level risks. Optionally configure which categories to include and the threshold for abandoned workflows.

### Get Credential Schema

Retrieve the JSON schema for a specific credential type. This is useful for understanding the required fields and their types before creating a credential.

### Get Execution

Retrieve details of a specific workflow execution including its status, timing, and optionally the full execution data with node-level results.

### Get Workflow

Retrieve a specific workflow by ID, including its full definition with nodes, connections, and settings. Optionally retrieve a specific historical version of the workflow.

### List Credentials

List all credentials stored in your n8n instance. Returns metadata only (name, type, timestamps) without exposing sensitive credential data.

### List Executions

List workflow executions with optional filtering by workflow, status, and project. Returns execution metadata including status, start/end times, and workflow info.

### List Users

List users on the n8n instance. Only available to the instance owner.

### List Workflows

List workflows in your n8n instance with optional filtering. Returns workflow metadata including name, active status, creation date, and tags. Supports filtering by active status, tags, name, and project.

### Manage Projects

Create, update, delete, or list projects in n8n. Projects group workflows and credentials for access control. Also supports managing project members.

### Manage Tags

Create, update, delete, or list tags used to organize workflows and credentials. Specify an **action** to determine the operation.

### Manage Variables

Create, update, delete, or list variables stored in your n8n instance. Variables provide fixed data accessible across all workflows. Requires Pro or Enterprise plan.

### Manage Workflow Tags

Get or update the tags assigned to a workflow. Use this to organize workflows by setting their tags, or to inspect current tag assignments.

### Retry Execution

Retry a failed workflow execution. By default, retries using the original workflow version from the failed execution. Set **useCurrentWorkflow** to true to retry with the latest workflow definition instead.

### Source Control Pull

Pull workflow changes from a connected Git repository into your n8n instance. Requires the Source Control feature to be licensed and configured.

### Stop Execution

Stop a currently running workflow execution.

### Transfer Resource

Transfer a workflow or credential to a different project. Useful for reorganizing resources across projects.

### Update Workflow

Update an existing workflow's definition, including its name, nodes, connections, and settings. If the workflow is currently active, it will be automatically reactivated with the new definition.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
