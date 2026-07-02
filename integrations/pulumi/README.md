# <img src="https://provider-logos.metorial-cdn.com/pulumi.png" height="20"> Pulumi

Manage cloud infrastructure-as-code through Pulumi Cloud. Create, list, and delete stacks and projects. Trigger and monitor deployments including updates, previews, destroys, and refreshes. Manage secrets, configuration, and environments (Pulumi ESC) with versioning and composability. Search and audit cloud resources across organizations. Enforce compliance with policy packs and policy groups. Configure scheduled operations like drift detection and TTL stack destruction. Manage organization membership, teams, and access tokens. Export audit logs and data for external analysis. Configure webhooks for stack, deployment, drift, policy, and environment events.

## Tools

### Cancel Deployment

Cancel an in-progress deployment on a stack. Use with caution — cancelling may leave the stack in an inconsistent state.

### Create Stack

Create a new Pulumi stack within a project. The project will be created automatically if it does not exist.

### Delete Stack

Delete a Pulumi stack. Use \

### Get Deployment

Retrieve details and optionally logs for a specific deployment. Use this to check deployment status, view logs, or monitor deployment progress.

### Get Stack

Retrieve detailed information about a specific Pulumi stack including its tags, current operation status, version, and optionally its outputs and resource details.

### List Audit Logs

Retrieve audit log events for a Pulumi organization. Shows user activity including stack operations, deployments, and access changes. Available for Enterprise and Business Critical editions.

### List Deployments

List deployments for a specific stack or across an entire organization. Useful for monitoring deployment history and status.

### List Environments

List all Pulumi ESC environments in an organization. Returns environment names, projects, and timestamps.

### List Organization Members

List all members of a Pulumi organization with their roles and profile information.

### List Policy Packs

List all policy packs in a Pulumi organization. Policy packs contain compliance and governance rules that are enforced during stack updates.

### List Stack Updates

List the update history for a Pulumi stack. Shows past operations (update, preview, destroy, refresh) with their results, resource changes, and timing.

### List Stacks

List all Pulumi stacks accessible to the authenticated user. Optionally filter by organization, project, or tags. Returns stack names, resource counts, and last update timestamps.

### Manage Access Tokens

List, create, or delete personal access tokens for the authenticated Pulumi user.

### Manage Environment

Create, read, update, or delete a Pulumi ESC (Environments, Secrets, and Configuration) environment. Environments store secrets, config, and credentials as versioned YAML definitions.

### Manage Stack Tags

Set or delete tags on a Pulumi stack. Tags are key-value metadata used for categorization and querying. You can set a new tag, update an existing one, or delete a tag.

### Manage Webhooks

List, create, or delete webhooks in Pulumi Cloud. Supports both organization-level webhooks (receive events for all stacks) and stack-level webhooks (scoped to a single stack).

### Open Environment

Open a Pulumi ESC environment to resolve and retrieve its computed values and secrets. This evaluates all dynamic providers (like AWS login, etc.) and returns the resolved values. Optionally retrieve a specific property path.

### Search Resources

Search across all cloud resources managed by Pulumi in your organization using Pulumi query syntax. Useful for auditing, incident response, and resource discovery.

### Trigger Deployment

Trigger a Pulumi deployment operation on a stack. Supports **update**, **preview**, **refresh**, and **destroy** operations. Deployment settings configured on the stack are inherited by default.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
