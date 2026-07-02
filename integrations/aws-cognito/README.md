# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Cognito

Manage user authentication and authorization for web and mobile apps. Create and configure user pools as user directories with password policies, MFA, and account recovery. Create, update, disable, and delete users and their attributes. Manage groups for role-based access control. Configure federated sign-in with SAML 2.0, OIDC, and social identity providers (Google, Facebook, Apple, Amazon). Set up app clients with OAuth scopes, callback URLs, and token settings. Create identity pools to issue temporary AWS credentials for authenticated or anonymous users. Migrate users via batch CSV import or just-in-time Lambda triggers. Customize ID and access tokens with pre-token generation triggers. Configure machine-to-machine authorization using OAuth client credentials flow with resource servers and custom scopes. Enable advanced security features for risk-based adaptive authentication. Respond to authentication lifecycle events including sign-up, authentication, token generation, and user migration via Lambda triggers.

## Tools

### List Groups

List all groups in a Cognito user pool. Returns group names, descriptions, precedence values, and associated IAM role ARNs. Supports pagination.

### List User Pools

List all Cognito user pools in the configured AWS region. Returns pool names, IDs, statuses, and creation dates. Supports pagination for accounts with many user pools.

### List Users

List users in a Cognito user pool. Supports filtering by attributes such as email, username, phone_number, name, given_name, family_name, preferred_username, sub, and status. Supports pagination for large user directories.

### Manage App Client

Create, get, update, delete, or list app clients for a Cognito user pool. App clients define how applications interact with the user pool, including authentication flows, OAuth scopes, callback URLs, and token settings.

### Manage Group Membership

Add or remove users from groups, list users in a group, or list groups for a user. Provides complete group membership management for role-based access control.

### Manage Group

Create, get, update, or delete a group in a Cognito user pool. Groups provide role-based access control and can be associated with IAM roles for identity pool authorization.

### Manage Identity Pool

Create, get, update, delete, or list Cognito identity pools (federated identities). Identity pools issue temporary AWS credentials to authenticated and guest users, enabling direct access to AWS services.

### Manage Identity Provider

Create, get, update, delete, or list federated identity providers (SAML, OIDC, Google, Facebook, Apple, Amazon) in a Cognito user pool. Manages federation configuration for external sign-in sources.

### Manage User Pool

Create, update, get, or delete a Cognito user pool. When creating, only the pool name is required. When updating, provide the user pool ID and the fields to change. Supports configuring password policies, MFA, auto-verification, and deletion protection.

### Manage User

Create, get, update, disable, enable, confirm, reset password, set password, or delete a user in a Cognito user pool. Combines all administrative user operations into a single flexible tool.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
