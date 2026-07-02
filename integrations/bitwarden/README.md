# <img src="https://provider-logos.metorial-cdn.com/bitwarden_logo.svg" height="20"> Bitwarden

Manage organization members, groups, collections, and policies in Bitwarden. Invite, update, and remove members, assign roles and group memberships, and configure collection access permissions. Enforce organization-wide security policies such as two-step login and master password requirements. Query and export event logs to track user actions and organization activity. Store, retrieve, create, update, and delete developer secrets (API keys, database credentials) organized into projects with granular access control. Supports SCIM provisioning for automatic user and group syncing from identity providers.

## Tools

### Create Group

Create a new group in the Bitwarden organization. Groups can be assigned to collections and have members added to simplify permission management.

### Delete Collection

Permanently delete a collection from the Bitwarden organization. All items in the collection will lose this collection assignment.

### Delete Group

Permanently delete a group from the Bitwarden organization. Members in the group will lose any permissions granted through the group.

### Get Group

Retrieve detailed information about a specific group, including its collection assignments and member IDs.

### Get Member

Retrieve detailed information about a specific organization member, including their role, status, collection assignments, and group memberships.

### Import Organization Data

Bulk import members and groups from an external directory or system. This is useful for directory synchronization scenarios where you need to sync users and groups from an identity provider into Bitwarden.

### Invite Member

Invite a new member to the Bitwarden organization by email. You can assign a role, grant access to all collections, or specify individual collection assignments.

### List Collections

List all collections in the Bitwarden organization. Returns each collection's external ID and group assignments.

### List Groups

List all groups in the Bitwarden organization. Returns each group's name, access settings, external ID, and collection assignments.

### List Members

List all members of the Bitwarden organization. Returns each member's role, status, email, two-factor authentication state, and collection assignments.

### List Policies

List all organization policies and their current state. Policies control organization-wide behaviors such as requiring two-step login, enforcing master password strength, and restricting vault exports.

### Query Event Logs

Query the organization's event logs. Filter by date range, acting user, or related item. Returns timestamped records of user actions, vault operations, collection changes, and more. Supports up to 367 days of history.

### Reinvite Member

Resend the invitation email to an organization member who has not yet accepted. Useful when the original invitation expired or was missed.

### Remove Member

Remove a member from the Bitwarden organization. This revokes their access to all shared collections but does not delete their Bitwarden user account.

### Revoke or Restore Member

Revoke or restore organization access for a member. Revoking suspends the member's access without removing them; restoring re-enables their access.

### Update Collection

Update a collection's external ID and group assignments. Collections cannot be created via the Public API, only updated or deleted.

### Update Group

Update an existing group's name, access settings, collection assignments, and/or member list.

### Update Member

Update an organization member's role, collection assignments, external ID, and/or group memberships. Provide only the fields you wish to change; unchanged fields should match current values.

### Update Policy

Enable, disable, or configure an organization policy. Policies enforce behaviors like requiring two-step login, setting master password requirements, and restricting vault exports. Available for Enterprise organizations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
