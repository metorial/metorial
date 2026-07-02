# <img src="https://provider-logos.metorial-cdn.com/okta.svg" height="20"> Okta

Manage identity and access management for organizations. Create, update, deactivate, and search users. Manage groups and group memberships. Assign users and groups to applications. Configure multi-factor authentication enrollment and verification. Create and manage OAuth 2.0 authorization servers, scopes, claims, and access policies. Set sign-on, password, and MFA enrollment policies. Query system logs for auditing and troubleshooting. Manage user sessions, devices, and inline hooks for customizing authentication flows. Supports webhooks for user authentication, lifecycle, group, application, policy, and security events.

## Tools

### Create User

Create a new user in Okta. Supports setting profile attributes, optional password/recovery question, and optionally assigning the user to groups during creation.

### Get User

Retrieve detailed information about a specific Okta user by their user ID or login. Returns full profile, status, credentials provider, and group/app memberships.

### List Applications

Search and list applications registered in your Okta organization. Supports keyword search and filter expressions.

### List Groups

Search and list groups in your Okta organization. Supports keyword search by name, filter expressions, and SCIM search queries.

### List Policies

List policies of a given type in your Okta organization. Returns sign-on, password, MFA enrollment, or access policies depending on the specified type.

### List Users

Search and list users in your Okta organization. Supports keyword search, Okta filter expressions, and SCIM search queries for flexible lookups by name, email, status, or any profile attribute.

### Manage App Assignment

Assign or unassign users and groups to/from an Okta application. Also supports listing current user and group assignments for an app.

### Manage Group Membership

Add or remove users from an Okta group, or list current group members. Use this to manage who belongs to a group.

### Manage Group

Create, update, or delete an Okta group. Use this to manage group lifecycle and profile attributes.

### Manage User Factors

List, enroll, or reset MFA factors for an Okta user. Supports SMS, email, TOTP, push, and other factor types.

### Query System Log

Query the Okta System Log for audit events. Supports filtering by time range, event type, keyword search, and Okta filter expressions. Useful for auditing, security monitoring, and troubleshooting.

### Update User

Update an existing Okta user's profile attributes. Only the provided fields will be updated; omitted fields remain unchanged.

### User Lifecycle

Perform lifecycle operations on an Okta user: **activate**, **deactivate**, **suspend**, **unsuspend**, **unlock**, **reset_password**, **reset_factors**, or **delete**. Each action transitions the user to a new status.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
