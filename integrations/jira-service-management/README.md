# <img src="https://provider-logos.metorial-cdn.com/jira.svg" height="20"> Jira Service Management

Create, view, search, and manage customer service requests (tickets) including comments, attachments, approvals, and SLA tracking. Manage service desk projects, request types, queues, customers, and organizations. Search knowledge base articles linked to Confluence. Manage assets and configuration items (CMDB) including schemas, object types, and attributes. Handle incident and alert management with on-call schedules, escalation policies, and routing rules. Perform full Jira issue CRUD, workflow transitions, JQL searches, and project management. Receive webhooks for issue, comment, attachment, project, sprint, and user events.

## Tools

### Add Comment

Add a comment to a Jira issue or service desk request. Supports both public (customer-visible) and internal (agent-only) comments for service desk requests.

### Create Customer Request

Create a new customer request (service desk ticket) in a JSM service desk. Requires a service desk ID and request type ID. The request can optionally be raised on behalf of a customer.

### Create Issue

Create a new Jira issue in a specified project. Supports setting summary, description, issue type, priority, assignee, labels, components, and custom fields.

### Delete Issue

Permanently delete a Jira issue. Optionally deletes subtasks as well. This action cannot be undone.

### Get Issue

Retrieve detailed information about a specific Jira issue by its key or ID. Returns the full issue fields including summary, description, status, assignee, comments, transitions, and SLA information for service desk requests.

### Get SLA Information

Retrieve SLA (Service Level Agreement) information for a customer request. Shows active and completed SLA cycles including time to first response, time to resolution, and custom SLA metrics.

### List Projects

List Jira projects accessible to the authenticated user. Returns project keys, names, types, and lead information.

### List Request Types

List request types available for a service desk, including their field definitions. Useful for discovering which request types are available and what fields they require before creating a customer request.

### List Service Desks

List all service desks available in the Jira Service Management instance. Returns service desk IDs, names, project keys, and descriptions.

### Manage Approval

View or action approvals on a customer request. Can list pending approvals for a request, or approve/decline a specific approval.

### Manage Customer

Create customer accounts, list customers for a service desk, or add/remove customers from a service desk. Customers are the end-users who submit requests through the service desk portal.

### Manage Organization

Create, list, get, or delete organizations. Also manage organization members by adding or removing users. Organizations group customers for service desk access management.

### List Queues & Issues

List service desk queues and optionally retrieve the issues within a specific queue. Queues are pre-configured filters agents use to manage incoming work.

### Search Issues

Search for Jira issues using JQL (Jira Query Language). Supports filtering by project, status, assignee, priority, labels, and any other issue fields. Use JQL syntax like \

### Search Knowledge Base

Search knowledge base articles linked to a service desk. Articles are sourced from linked Confluence spaces. Useful for finding existing documentation or solutions before creating new requests.

### Search Users

Search for Jira users by name or email. Returns matching user accounts with their account IDs, display names, and email addresses. Useful for finding user account IDs needed by other tools.

### Update Issue

Update an existing Jira issue's fields. Supports changing summary, description, priority, labels, components, assignee, and custom fields. Can also transition the issue to a new status or assign/unassign it.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
