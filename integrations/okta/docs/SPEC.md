# Slates Specification for Okta

## Overview

Okta is a cloud-based identity and access management (IAM) platform that provides user authentication, authorization, and user lifecycle management. It offers APIs for managing users, groups, applications, policies, multi-factor authentication, and OAuth 2.0/OpenID Connect authorization servers. Okta serves as a centralized identity provider for organizations to secure access to their applications and APIs.

## Authentication

Okta supports two methods for authenticating API requests to its management APIs:

### 1. SSWS API Token (API Key)

You can access the Okta API with the custom HTTP authentication scheme SSWS. All requests must have a valid API key specified in the HTTP Authorization header with the SSWS scheme, e.g., `Authorization: SSWS 00QCjAl4MlV-WPXM...0HmjFx-vbGua`.

API tokens are created via the Admin Console under Security > API > Tokens. They are issued for a specific user, and all requests made with the token act on behalf of that user. API tokens are secrets and should be treated like passwords. They inherit the privilege level of the admin account used to create them.

API tokens are valid for 30 days and automatically renew every time they're used. When a token has been inactive for more than 30 days, it's revoked and can't be used again.

Note: API keys aren't scoped and have full access to all Okta APIs matching the permissions of the administrator that created the key.

**Required inputs:**

- **Okta domain**: Your org's subdomain, e.g., `https://{yourOktaDomain}` (such as `https://dev-123456.okta.com`)
- **API token**: Generated in the Admin Console

### 2. OAuth 2.0 (Recommended)

You can access Okta APIs with either an OAuth 2.0 access token or an API token. Okta recommends using scoped OAuth 2.0 access tokens.

There are two OAuth 2.0 flows supported:

**a) Authorization Code flow (for user-context access):**

- Create an OIDC app in the Okta Admin Console (Web Application type).
- Request an access token from your Okta org authorization server's `/authorize` endpoint. Only the org authorization server can mint access tokens that contain Okta API scopes.

**b) Client Credentials flow (for service/machine-to-machine access):**

- The Client Credentials grant flow is intended for server-side (confidential) client apps with no end user, which normally describes machine-to-machine communication. To mint access tokens that contain Okta scopes, the Client Credentials flow is the only flow supported with an OAuth 2.0 service app.
- The `private_key_jwt` client authentication method is the only supported method for OAuth service apps that want to get access tokens with Okta scopes. You must generate a public/private key pair (RSA or EC) and register the public key with the service app.

**Scopes** follow the format `okta.<resource>.<operation>`. For example:

- `okta.<resource>.read` scopes for GET operations. `okta.<resource>.manage` scopes for GET, POST, PUT, and DELETE operations. Self scopes (`okta.<resource>.<operation>.self`) only allow access to the user who authorized the token.

Common scopes include: `okta.users.read`, `okta.users.manage`, `okta.groups.read`, `okta.groups.manage`, `okta.apps.read`, `okta.apps.manage`, `okta.policies.read`, `okta.policies.manage`, `okta.logs.read`, `okta.eventHooks.read`, `okta.eventHooks.manage`, among others.

**Required inputs:**

- **Okta domain**: Your org's subdomain
- **Client ID**: From the OIDC app registration
- **Client Secret** (Authorization Code flow) or **Private Key** (Client Credentials flow)
- **Scopes**: As needed for your use case

## Features

### User Management

Create, read, update, delete, and search users. Manage user profiles, credentials, and lifecycle operations (activate, deactivate, suspend, unsuspend, unlock). The Users API is used for CRUD operations on users. Users can also be assigned to groups and applications.

### Group Management

Create, list, update, and delete groups. Manage group membership by adding or removing users. Groups can be used for policy assignment and application access control.

### Application Management

The Apps API is used to manage apps and their association with users and groups. Register and configure application integrations (SAML, OIDC, SWA), assign users and groups to apps, and manage app credentials and sign-on settings. Supports both custom apps and apps from the Okta Integration Network (OIN).

### Authentication

The Authentication API provides operations to authenticate users, perform multifactor enrollment and verification, recover forgotten passwords, and unlock accounts. Supports primary authentication with username/password, multi-factor authentication challenges, and session management.

### Multi-Factor Authentication (MFA)

The User Factors API is used to enroll, manage, and verify factors for Multifactor Authentication (MFA). Supports various factor types including SMS, email, TOTP (Okta Verify, Google Authenticator), push notifications, security questions, and hardware tokens.

### OAuth 2.0 & OpenID Connect Authorization Servers

API Access Management is the implementation of the OAuth 2.0 standard by Okta. Okta integrates API Access Management with the implementation of OpenID Connect for authentication. Create and manage custom authorization servers, define custom scopes and claims, configure access policies and rules, and manage OAuth 2.0 client applications.

### Policy Management

The Policy API creates and manages settings such as a user's session lifetime. Configure sign-on policies, password policies, MFA enrollment policies, and access policies that control how users authenticate and access resources.

### Session Management

The Sessions API creates and manages user's authentication sessions. Create, retrieve, and revoke user sessions programmatically.

### Device Management

The Devices API is used to manage device identity and lifecycle. Track and manage devices used for authentication.

### System Log

Query the System Log for auditing and troubleshooting. The log captures a wide range of events including authentication attempts, user lifecycle changes, policy changes, and administrative actions. Supports filtering by event type, time range, actor, and target.

### Inline Hooks

Inline Hooks help developers pause an Okta flow to add information or make a decision. Through an HTTP request, a non-Okta source can modify a running request within Okta and infuse additional information. As Okta processes like registering, authenticating, or importing users are occurring, Okta can call out to your custom code. Okta then waits for the callback response and, based on that response, you can define which actions Okta should take. Types include token enrichment, SAML assertion, user import, registration, password import, and telephony hooks.

### Privileged Access Management

Okta Privileged Access (OPA) is a PAM solution designed to help mitigate the risk of unauthorized access to resources. It builds on server access control capabilities and delivers a unified approach to managing access to privileged accounts. OPA securely connects people, machines, and applications to privileged resources such as servers, containers, and enterprise apps.

### Feature Management

The Okta Features API provides operations to manage self-service Early Access (EA) and Beta features in your org. Enable or disable feature flags programmatically.

## Events

Okta supports webhooks through its **Event Hooks** mechanism.

Okta event hooks are an implementation of the industry concept of webhooks. Event hooks are meant to deliver information about events that occurred, not to provide a way to affect the execution of the underlying Okta process flow. Event hooks are asynchronous calls, meaning that the process flow that triggered the event hook continues without stopping or waiting for any response from your external service.

You can have a maximum of 25 active and verified event hooks set up in your org at any time. Each event hook can be configured to deliver multiple event types.

When registering an event hook, you provide an HTTPS endpoint URL and optionally an authorization header secret. After registering, Okta sends a one-time GET request to the endpoint containing a `x-okta-verification-challenge` header. You must return the challenge value in a JSON response body. Subsequent event notifications are sent as POST requests.

You can reduce the number of event hook calls by defining filters on specific instances of the subscribed event type. For example, if you want an event hook call triggered by user sign-in events for a specific group of users, you can filter on that group.

The following are the high-level event categories available for event hooks:

### User Authentication Events

Events triggered when activities related to user authentication occur, including sign in, sign out, password change, or when a user authenticates via MFA.

### User Lifecycle Events

Events covering user lifecycle changes such as user creation, activation, deactivation, suspension, and deletion. Also includes profile updates and password resets.

### User Import Events

Events triggered when users are imported into Okta using a batch process. Events are raised for both the start and end of the process, or when the import threshold is exceeded.

### Group Events

Events fired when groups are added or removed, either directly or by a batch process. Includes group membership changes (users added/removed from groups).

### Application Events

Events related to application lifecycle and user-application assignments, such as when users are assigned or unassigned from apps.

### OAuth 2.0 / OIDC Events

Events related to OAuth 2.0 token operations, including token grants, revocations, consent changes, and OAuth client lifecycle events (creation, update, deletion, activation, deactivation).

### Security / Suspicious Activity Events

Events related to suspicious activity reports in organizations, such as when unknown persons try to sign in using stolen credentials. Okta supports event hooks for this type of activity.

### Device Trust Events

Device trust events are fired when devices are registered to be used to authenticate into an Okta organization.

### Policy Events

Events related to policy changes, including sign-on policy, password policy, and MFA policy modifications.

### Administrative Events

Events related to administrative actions such as API token creation/revocation, admin role assignments, and configuration changes.
