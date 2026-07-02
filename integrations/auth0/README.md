# <img src="https://provider-logos.metorial-cdn.com/Auth0.png" height="20"> Auth0

Manage users, roles, permissions, and identity provider connections for authentication and authorization. Create, read, update, and delete users across identity connections. Configure social, enterprise, and passwordless authentication methods. Assign roles and permissions using role-based access control (RBAC). Register and manage applications and API resource servers. Set up multi-factor authentication (MFA) including SMS, email, TOTP, and WebAuthn. Create organizations for multi-tenant B2B scenarios and invite members. Build custom serverless Actions for login, registration, and password change flows. Configure custom domains, email templates, branding, and attack protection. Import and export users in bulk. Retrieve authentication logs and audit events. Manage client grants and log streams for event delivery.

## Tools

### Create User

Create a new user in Auth0. The user will be created in the specified connection (e.g., "Username-Password-Authentication"). Depending on the connection type, different fields may be required.

### Delete User

Permanently delete a user from Auth0. This action is irreversible and removes all associated data.

### Get Logs

Retrieve tenant log events for authentication activity, user actions, and administrative operations. Supports Lucene query syntax filtering, pagination, and cursor-based retrieval.

### Get User

Retrieve a single user by their ID. Returns the full user profile including metadata, identities, roles, and permissions.

### Manage Actions

Create, update, deploy, delete, or list Auth0 Actions. Actions are serverless functions that execute during authentication flows (login, registration, password change, etc.) to add custom logic.

### Manage Applications

Create, update, delete, or list applications (clients) in Auth0. Applications represent the apps and services that use Auth0 for authentication. Supports native, SPA, regular web, and machine-to-machine app types.

### Manage Client Grants

Create, update, delete, or list client grants. Client grants authorize applications to request access tokens for specific APIs with defined scopes.

### Manage Connections

Create, update, delete, or list identity provider connections. Connections define how users authenticate — database, social (Google, Facebook), enterprise (SAML, OIDC), or passwordless (SMS, email).

### Manage Organization Members

List, add, or remove members from an organization. Members are Auth0 users associated with an organization for multi-tenant B2B scenarios.

### Manage Organizations

Create, update, delete, or list organizations for multi-tenant B2B scenarios. Organizations group users and can have their own connections, branding, and member roles.

### Manage Resource Servers

Create, update, delete, or list API resource servers. Resource servers represent APIs protected by Auth0, with defined scopes/permissions and token settings.

### Manage Roles

Create, update, delete, or list roles. Roles define sets of permissions that can be assigned to users for role-based access control (RBAC).

### Manage User Roles

List, assign, or remove roles for a user. Use the action parameter to specify the operation: "list" to get current roles, "assign" to add roles, or "remove" to remove roles.

### Search Users

Search and list users in your Auth0 tenant. Supports Lucene query syntax for filtering by email, name, connection, metadata, and other user attributes. Returns paginated results with up to 50 users per page.

### Update User

Update an existing user's profile, metadata, or account status. Can update email, password, profile fields, metadata, and blocked status.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
