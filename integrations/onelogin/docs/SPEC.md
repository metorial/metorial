# Slates Specification for OneLogin

## Overview

OneLogin (by One Identity) is a cloud-based identity and access management (IAM) platform that provides single sign-on (SSO), multi-factor authentication (MFA), user provisioning, and directory integration for both cloud and on-premises applications. It enables organizations to securely manage user access through its Unified Access Management platform. The API is RESTful, uses JSON, and is secured by OAuth 2.0 authentication.

## Authentication

OneLogin uses **OAuth 2.0 Client Credentials** for API authentication. The API uses OAuth2 for authorization — your client credentials (Client ID and Client Secret) are used to request an access token, which is then used for subsequent API calls.

### Steps to Authenticate

1. **Create API Credentials**: Access OneLogin as an account owner or administrator, go to Developers > API Credentials, and click New Credential. Select a scope for the credentials.

2. **Generate an Access Token**: POST to the token endpoint with your client ID and client secret:

   ```
   POST https://<subdomain>.onelogin.com/auth/oauth2/v2/token
   ```

   The response includes an `access_token`, `created_at`, `expires_in`, `refresh_token`, and `token_type` (bearer).

3. **Use the Access Token**: Include the token in the `Authorization` header as `bearer:<access_token>` on all subsequent API calls.

### Required Inputs

- **Subdomain**: Your OneLogin account subdomain (e.g., `mycompany` for `mycompany.onelogin.com`). Your sitename becomes your OneLogin subdomain.
- **Client ID**: Generated when creating API credentials.
- **Client Secret**: Generated when creating API credentials.

### Token Details

- An access token is valid for 10 hours.
- The `grant_type` must be set to `client_credentials`.

### API Credential Scopes

When creating API credentials, you must select a scope that determines what the token can access. Available scopes include:

- **Authentication Only**: Gives the credential pair the ability to generate an access token that can perform POST calls only to authentication endpoints.
- **Read Users**: Gives the credential pair the ability to generate an access token that can perform GET calls available for the User, Role, and Group API resources.
- **Manage Users**: Allows read and write access to User, Role, and Group resources.
- **Read All**: Read access across all API resources.
- **Manage All**: Gives the credential pair the ability to generate an access token that can perform GET, POST, PUT, and DELETE calls for all available API resources, including the ability to set passwords and assign and remove roles.

## Features

### User Management

Create, read, update, and delete users in the OneLogin directory. User attributes include name, email, username, department, title, phone, status, custom attributes, and more. Users can be filtered, sorted, and searched by various fields including wildcards.

### Role Management

Manage roles that control access to applications. Roles can be assigned to users and associated with applications. Roles are also used as the basis for group provisioning via SCIM.

### Application (App) Management

The Apps API can be used to list, create, update, and manage apps. Often this set of APIs is used to back up the configuration of an app so that changes can be restored to a previous state. Apps represent the SSO-connected services in your OneLogin account.

### Multi-Factor Authentication (MFA)

OneLogin provides a series of API endpoints that let you manage MFA for your users. With these APIs you can register and verify a variety of different MFA factors. Supported factors include OneLogin Protect, SMS, Email, Google Authenticator, OneLogin Voice, and other authenticators that use Key URI Format. You can enroll devices, trigger OTP delivery, and verify codes.

### User Authentication / Session Management

Authenticate users programmatically by passing their credentials. Supports login flows with and without MFA, including session token generation and delegated authentication. Useful for building custom login pages.

### API Authorization Server

This collection of APIs lets you configure OneLogin as an Authorization Server. The purpose of the Authorization Server is to authenticate a user and return an Access Token for authorizing access to downstream APIs. You can define custom scopes, claims, and associate OpenID Connect apps with your authorization server configuration.

### Smart Hooks

A Smart Hook is an extension point in OneLogin that lets you define customized actions using Javascript code. You will use the Smart Hooks API to configure a javascript function that gets executed every time a specific hook fires. Smart Hooks are serverless, meaning OneLogin will host and execute the javascript functions for you.

Available hook types include:

- **Pre-Authentication Hook**: Runs synchronously as part of a UI-based login flow. The hook fires immediately after the user enters a username/email but before they enter their password or are prompted for MFA. Can be used to dynamically change user policies based on context (device, location, risk score).
- **User Migration Hook**: Targeted at CIAM prospects and offers a way to seamlessly migrate users from an external database or Identity Provider into the OneLogin Cloud Directory.

Smart Hooks support environment variables, external NPM packages, and conditions for targeting specific roles.

### Events and Reporting

Query historical events from your OneLogin account. Events can be filtered by event type, user, date range, and other attributes. Useful for audit logging, compliance, and extracting data for reporting.

### SCIM Provisioning

OneLogin supports SCIM (System for Cross-domain Identity Management) for automated user provisioning to third-party applications. Use the SCIM API reference as a guide to designing your SCIM APIs to respond to requests from OneLogin SCIM provisioning. Supports user create, update, delete, and group management operations.

### Groups

Manage user groups in OneLogin. Groups function as security boundaries to apply specific security policies to users.

### Directory Sync

Integrate with external directories (e.g., Active Directory, LDAP) for user synchronization.

## Events

OneLogin supports webhooks through its **Event Broadcaster** (also called the Event Webhook). Webhooks provide a way to make event-driven decisions in your application. The OneLogin Event Webhook API will send batches of events in near real-time to an endpoint that you specify.

### Configuration

- Webhooks need to be set up via the OneLogin Admin portal under Developers > Webhooks. There isn't currently an API for setting up the webhook endpoint.
- When configuring your Event Broadcaster you have the opportunity to specify custom headers that will be sent along with each request. A great way to add additional security and verify authenticity is to set an arbitrary string as a custom header value.
- If a non-200 code is returned or a timeout occurs then the webhook payload will be sent to your endpoint again. This process will be repeated for a maximum of 3 attempts and then will not be sent again.

### Event Categories

The events webhook endpoint is a firehose of every event that occurs on your OneLogin account. Filtering can be done based on event_type_id and other attributes like risk_score. Key event categories include:

- **Authentication Events**: User logins, logouts, failed login attempts, and session-related activity. Each login event may include a risk score (when Adaptive Authentication is enabled).
- **User Lifecycle Events**: User creation, updates, deletion, suspension, role assignment/removal, and password changes.
- **App Events**: App added/removed from roles, app access events, SAML assertions.
- **MFA Events**: OTP device registration, MFA factor verification, authentication factor changes.
- **Admin/Account Events**: Admin actions, policy changes, directory sync events, API credential changes.
- **Provisioning Events**: SCIM provisioning activities, directory sync runs.

A full list of available Event Types can be retrieved dynamically by calling the Get Event Types API, which provides event type names, IDs, and descriptions.
