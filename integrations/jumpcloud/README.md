# <img src="https://provider-logos.metorial-cdn.com/jumpcloud.png" height="20"> Jumpcloud

Manage users, devices, and access across a cloud directory platform. Create, update, and delete user accounts and groups. Bind users and groups to systems, SSO applications, RADIUS servers, and LDAP directories via graph associations. Manage device policies for security enforcement (disk encryption, password complexity, screen lock). Execute remote commands and scripts on managed Windows, Mac, and Linux systems. Configure SAML/OIDC SSO application connectors. Provision and deprovision application users via SCIM. Manage RADIUS server configurations for WiFi and VPN authentication. Integrate with external directories like Google Workspace, Microsoft 365, and Active Directory. Query audit logs and directory event data for compliance. Retrieve device telemetry including installed software, hardware details, and OS configuration. Manage organization settings and administrator roles. Receive webhook notifications for directory changes, authentication events, device monitoring, and policy/command execution results.

## Tools

### Get System

Retrieve detailed information about a specific JumpCloud-managed system (device) by its ID. Returns hardware info, OS details, agent status, and security configuration.

### Get User

Retrieve detailed information about a specific JumpCloud user by their ID. Returns full user profile including contact info, employment details, security settings, custom attributes, and account status.

### List Applications

List SSO application connectors configured in JumpCloud. Returns application names, SSO URLs, and configuration details for SAML 2.0 and OIDC-based single sign-on integrations.

### List Command Results

List results from previously executed JumpCloud commands. Shows exit codes, stdout output, errors, and execution timestamps. Useful for checking command execution status and debugging failures.

### List Groups

List JumpCloud user groups or system groups. Groups are the primary mechanism for organizing resources and controlling access to systems, applications, RADIUS servers, and directories.

### List Systems

List and search JumpCloud-managed devices (systems). Returns device details including OS, hostname, agent version, and connectivity status. Supports filtering by system attributes and pagination.

### List Users

List and search JumpCloud directory users. Supports filtering by user attributes and pagination for large directories. Returns user profiles including contact information, employment details, and account status.

### Manage Associations

Manage graph associations (resource bindings) between JumpCloud objects. Associations connect users, user groups, systems, system groups, applications, RADIUS servers, LDAP servers, and other directory resources. Use this to bind or unbind resources.

### Manage Command

Create, update, or delete a JumpCloud remote command (script). Commands can be scheduled, triggered via webhook, or run on demand on managed devices. Supports both Linux/Mac shell commands and Windows PowerShell/CMD commands.

### Manage Group Membership

Add or remove members from a JumpCloud user group or system group. Also supports listing current members. Use this to control which users belong to a user group or which systems belong to a system group.

### Manage System Group

Create, update, or delete a JumpCloud system (device) group. System groups organize devices and control which policies, commands, and user groups apply to them.

### Manage System

Update or delete a JumpCloud-managed system (device). Systems are registered automatically when the JumpCloud agent is installed, so this tool only supports updates and deletion. Update display name, SSH settings, MFA configuration, and other system properties.

### Manage User Group

Create, update, or delete a JumpCloud user group. User groups are the primary way to organize users and control access to systems, applications, RADIUS servers, and directories. Provide a name at minimum when creating.

### Manage User

Create, update, or delete a JumpCloud directory user. When creating, provide username and email at minimum. When updating, provide the user ID and any fields to change. Supports managing user state (activate, suspend, stage), contact info, employment details, custom attributes, and security settings like MFA and password policies.

### Query Directory Events

Query JumpCloud Directory Insights event logs for audit trails, compliance, and monitoring. Search across categories like SSO authentications, RADIUS events, system logins, LDAP operations, MDM events, and directory changes. Supports time range filtering and cursor-based pagination.

### Run Command via Trigger

Execute a JumpCloud command via its webhook trigger name. The command must have been previously created with launchType "trigger" and a trigger name configured. Optionally pass environment variables as key-value pairs that will be available to the command script.

### User Actions

Perform administrative actions on a JumpCloud user account. Supports resetting MFA enrollment (forces re-enrollment on next login) and unlocking a locked-out user account.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
