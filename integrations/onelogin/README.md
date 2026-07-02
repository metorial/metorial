# <img src="https://provider-logos.metorial-cdn.com/onelogin.png" height="20"> Onelogin

Manage identity and access management (IAM) for organizations. Create, read, update, and delete users, roles, and groups. Configure and manage SSO-connected applications. Enroll and verify multi-factor authentication (MFA) factors including SMS, email, and authenticator apps. Authenticate users programmatically and generate session tokens. Set up authorization servers with custom scopes and claims. Configure Smart Hooks for custom pre-authentication and user migration logic. Query historical events for audit logging and compliance. Automate user provisioning via SCIM to third-party applications. Sync users from external directories like Active Directory and LDAP. Receive near real-time event webhooks for authentication, user lifecycle, app access, MFA, and provisioning activities.

## Tools

### Create User

Create a new user in the OneLogin directory. At minimum, an email or username is required. Optionally set name, department, title, phone, status, group, roles, and custom attributes.

### Delete User

Permanently delete a user from the OneLogin directory. This action cannot be undone.

### Enroll MFA Factor

Enroll a new MFA factor for a OneLogin user. Supports SMS, Email, Voice, Google Authenticator, OneLogin Protect, and other TOTP authenticators. After enrollment, use the registration ID to verify the factor with an OTP code.

### Get App

Retrieve detailed information about a specific OneLogin application by its ID. Returns full configuration including SSO settings, provisioning config, parameters, and role associations.

### Get Event Types

Retrieve all available event types from OneLogin. Each event type has an ID, name, and description. Use these IDs to filter events when querying the events API. Results should be cached as this endpoint is rate-limited.

### Get MFA Factors

Retrieve MFA information for a user including both available (unenrolled) factors and enrolled devices. Provides a complete view of a user's multi-factor authentication status.

### Get User

Retrieve detailed information about a specific OneLogin user by their ID. Returns the full user profile including name, email, status, roles, group, custom attributes, and activity timestamps.

### List Apps

List SSO-connected applications in OneLogin. Filter by name (wildcards supported), connector ID, or authentication method. Returns app metadata including auth method, visibility, and timestamps.

### List Events

Query historical events from your OneLogin account for audit logging, compliance, and reporting. Filter by event type, user, date range, and other attributes. Returns events with actor, target, app, and risk information.

### List Groups

List all groups in OneLogin. Groups function as security boundaries to apply specific security policies to sets of users.

### List Roles

List roles in OneLogin. Roles control user access to applications. Filter by name, app ID, or app name. Optionally include associated apps, users, and admins.

### List Users

Search and list users in the OneLogin directory. Supports filtering by name, email, username, directory, external ID, app, and date ranges. Use wildcards (\*) in filter values for partial matching.

### Manage App

Create, update, or delete an SSO-connected application in OneLogin. When creating, a connector ID and name are required. When updating, provide the app ID and any fields to change. When deleting, provide the app ID.

### Manage Role

Create, update, or delete a role in OneLogin. Roles control which applications users have access to. When creating, provide a name and optionally associate apps, users, and admins. When updating, provide the role ID and fields to change. When deleting, provide the role ID and set action to "delete".

### Manage User Roles

Assign or remove roles from a OneLogin user. Roles control which applications a user can access. You can assign multiple roles at once or remove specific roles.

### Update User

Update an existing user's profile in OneLogin. Supports updating name, email, username, department, title, phone, status, state, group, roles, manager, and custom attributes. Only provided fields will be updated.

### Verify MFA Factor

Verify an MFA factor enrollment by submitting the OTP code. Use this after enrolling a factor to complete the registration. For push-based factors like OneLogin Protect and Voice, use the poll option to check completion status.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
