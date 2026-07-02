# Slates Specification for Auth0

## Overview

Auth0 is an identity platform that provides authentication and authorization as a service. It offers user management, single sign-on (SSO), multi-factor authentication (MFA), and API security for web and mobile applications. Auth0 is part of Okta and supports a wide range of identity protocols including OAuth 2.0 and OpenID Connect.

## Authentication

Auth0's Management API uses OAuth 2.0 Client Credentials flow for authentication. The process requires:

1. **Tenant Domain**: Your Auth0 tenant domain (e.g., `your-tenant.auth0.com` or `your-tenant.us.auth0.com` for US regions).

2. **Machine-to-Machine Application**: From the Auth0 Dashboard's API page, choose Auth0 Management API, and select the 'Machine to Machine Applications' tab to authorize your application.

3. **Obtaining an Access Token**: Perform a POST operation to the `https://{yourDomain}/oauth/token` endpoint, using the credentials of the Machine-to-Machine Application. The request requires:
   - `grant_type`: `client_credentials`
   - `client_id`: Your application's Client ID
   - `client_secret`: Your application's Client Secret
   - `audience`: `https://{yourDomain}/api/v2/`

4. **Using the Token**: Include the token in the Authorization header of your request as a Bearer token. The API base URL is `https://{yourDomain}/api/v2`.

5. **Scopes**: Request scoped access tokens to restrict permissions to only what your application requires. Scoped access tokens improve security by limiting each token's capabilities to the specific operations needed, such as `create:users`, `read:users`, or `update:users`. Scopes follow the pattern `{action}:{resource}` (e.g., `read:users`, `update:users`, `delete:clients`, `read:logs`, `create:connections`). Scopes are granted to the M2M application from the Auth0 Dashboard.

## Features

### User Management

Create, read, update, and delete users across identity connections. Manage user profiles and metadata, link multiple identity provider accounts to a single user, assign roles and permissions, and search users by various attributes. Users must be associated with a connection (e.g., `Username-Password-Authentication`).

### Connections

Configure identity provider connections such as databases, social logins (Google, Facebook, etc.), enterprise connections (SAML, OIDC, AD/LDAP), and passwordless options (SMS, email). Each connection defines how users authenticate.

### Applications (Clients)

Register and manage applications that use Auth0 for authentication. Configure application types (native, SPA, regular web, machine-to-machine), allowed callback URLs, origins, and authentication methods.

### Roles and Permissions (RBAC)

Define roles with associated permissions and assign them to users. Permissions are scoped to specific APIs (Resource Servers). Supports role-based access control for fine-grained authorization.

### Organizations

Manage multi-tenant B2B scenarios by grouping users into organizations. Configure organization-specific connections, branding, and member roles. Invite users to organizations.

### Multi-Factor Authentication (MFA)

Configure and manage MFA factors for users including SMS, email, TOTP (authenticator apps), WebAuthn (security keys), and push notifications via Auth0 Guardian. Enroll, update, and remove authentication methods per user.

### Actions

Create and manage serverless functions (Actions) that execute during specific Auth0 flows such as login, registration, and password changes. Actions allow custom logic to be inserted into the authentication pipeline.

### Custom Domains

Configure and verify custom domains to white-label the Auth0 authentication experience under your own domain.

### Email Templates

Manage email templates for verification emails, password resets, welcome emails, and other identity-related communications.

### Logs

Retrieve tenant log events for authentication activity, user actions, and administrative operations. Useful for auditing and debugging.

### API Resource Servers

Register and manage APIs (Resource Servers) that Auth0 protects. Define scopes/permissions for each API and configure token settings such as signing algorithm and lifetime.

### Branding

Customize the look and feel of the Universal Login page, including colors, logos, and templates.

### Client Grants

Manage which applications are authorized to request access tokens for specific APIs, along with the permitted scopes.

### Jobs (Bulk Operations)

Import or export users in bulk using background jobs. Useful for migration scenarios or generating user data exports.

### Attack Protection

Configure protections such as brute-force detection, breached password detection, and suspicious IP throttling.

## Events

Auth0 supports event streaming via **Log Streams**, which deliver tenant log events in real-time to external services. Webhooks allow events to be delivered to an external web server. Log streams can be configured as custom webhooks (HTTP POST to a URL) or through built-in integrations with services like Amazon EventBridge, Azure Event Grid, Datadog, Splunk, Sumo Logic, Mixpanel, and Segment.

You can filter your log streams so only select logs and log categories are delivered. The following event categories are available as filters:

### Authentication Events

Covers the full authentication lifecycle including login (success/failure/notification), logout (success/failure), signup (success/failure), silent authentication (success/failure), and token exchange (success/failure). These track user authentication attempts across all connection types.

### Actions Events

Tracks execution of Auth0 Actions, specifically failed Action executions.

### Management API Events

Captures successful and failed Management API operations, including API calls that return secrets.

### System Events

Notifications about system-level occurrences such as Auth0 updates, AD/LDAP connector status changes, rate limit alerts, failed user imports, and deprecation notices.

### User/Behavioral Events

Tracks user account changes and MFA-related activity. Includes password changes, email/phone/username changes, user deletions, MFA enrollment and unenrollment, refresh token revocations, email verification, and anomaly detection blocks (success/failure/notification).

### SCIM Events

Tracks successful and failed SCIM provisioning operations.

**Configuration options:**

- You can only subscribe one payload URL per webhook configuration, but you can use the same URL for multiple streams.
- Payload format options: JSON Lines, JSON Array, or JSON Object.
- An authorization header value can be configured for webhook authentication.
- Auth0 events are delivered to your server via a streaming mechanism that sends each event as it is triggered in our system. If your server is unable to receive the event, we will retry up to three times to deliver the event.
