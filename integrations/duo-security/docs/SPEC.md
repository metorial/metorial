Now let me check if Duo supports webhooks or event subscriptions:Now I have enough information to write the specification. Duo Security does not appear to support native webhooks or event subscriptions - all SIEM integrations rely on polling the log endpoints.

# Slates Specification for Duo Security

## Overview

Duo Security (now Cisco Duo) is a cloud-based multi-factor authentication (MFA) and access security platform. It provides APIs for adding two-factor authentication to applications, programmatically managing users, devices, administrators, and integrations, and retrieving authentication and activity logs. The platform also offers single sign-on (SSO), device trust verification, and identity threat detection capabilities.

## Authentication

Duo uses HTTP Basic Authentication for all API requests. The integration key is used as the HTTP username, and an HMAC signature of the request is used as the password. To construct the signature, build a canonical string from the request date, HTTP method, API hostname, request path, and parameters (separated by newline characters), then compute an HMAC-SHA1 of this string using the secret key. HMAC-SHA512 is also supported as a newer signing method.

Three credentials are required, all obtained from the Duo Admin Panel:

- **Integration Key (ikey)**: Acts as the API client identifier (used as the HTTP Basic Auth username).
- **Secret Key (skey)**: Used as the HMAC key for signing requests. Must be kept confidential.
- **API Hostname**: The account-specific API endpoint in the format `api-XXXXXXXX.duosecurity.com`.

To obtain these credentials, log in to the Duo Admin Panel, navigate to Applications → Application Catalog, locate the desired API type (e.g., Admin API), and click Add to create the application and receive the integration key, secret key, and API hostname.

Only administrators with the Owner role can create or modify an Admin API application in the Duo Admin Panel.

Each API request must include an `Authorization` header (Base64-encoded `integration_key:hmac_signature`) and a `Date` header in RFC 2822 format. The signature must be recomputed for every request.

**API Permissions** (configured per Admin API application):

- Grant resource - Read / Write (users, phones, tokens, groups)
- Grant read log (authentication, administrator, telephony logs)
- Grant administrators - Read / Write
- Grant applications
- Grant settings - Read / Write

**Separate API types** exist for different use cases, each requiring its own set of credentials:

- **Admin API**: Administrative management and log retrieval
- **Auth API**: Two-factor authentication operations
- **Accounts API**: MSP partner account management
- **Device API**: Trusted endpoint device management

## Features

### User Management

Create, retrieve, update, and delete users, phones, hardware tokens, admins, and integrations. Users can be associated with groups, phones, hardware tokens, WebAuthn credentials, and desktop authenticators. User statuses include Active, Bypass, Disabled, and Locked Out.

### Group Management

Manage groups of users for applying policies and controlling access. Users can be associated with or disassociated from groups. Groups can be used to scope access policies per application.

### Two-Factor Authentication

Integrate with Duo's platform to verify service connectivity, retrieve available authentication devices for a user, and perform authentication. Supports Duo Push notifications, phone call verification, SMS passcodes, hardware token passcodes, and WebAuthn/FIDO2 security keys. Can be used to add MFA to custom applications.

### Phone and Device Management

Manage phones and devices associated with users for MFA purposes. Register, activate, and remove phones. Send activation links for Duo Mobile. Manage trusted endpoints to ensure only known devices can access protected services.

### Administrator Management

Create and manage Duo administrator accounts with various roles (Owner, Administrator, User Manager, Security Analyst, Application Manager, Read-only, Billing). Custom admin roles with granular permissions can also be created.

### Application (Integration) Management

Manage Duo-protected applications/integrations. Configure application-level policies, new user behavior, and access settings.

### Policy Management

Define access policies by user group and per application. Manage policies centrally and apply them globally, to specific user groups, or to specific applications. Policies control authentication methods, device trust requirements, remembered devices, and network-based access rules.

### Logs and Reporting

Programmatically read authentication logs, administrator logs, and telephony logs; read or update account settings; and retrieve reports. The v2 authentication logs endpoint supports filtering on users, groups, applications, authentication results, factors, and time ranges. Five log types are available: authentication events, administrator actions, telephony logs, user activity, and offline enrollment data.

- Authentication logs have a two-minute delay before events become available.
- Logs are retrievable for up to 180 days.

### Account Settings

Read and update global account settings, including lockout thresholds, enrollment options, and notification preferences.

### MSP Account Management (Accounts API)

The Accounts API allows Duo MSP partners to create, update, and delete managed Duo Security customer accounts. Manage child account editions and telephony credits.

### Directory Sync

Configure and trigger user directory synchronization with external identity providers.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. All event consumption (authentication logs, administrator action logs, telephony logs, activity logs, and Trust Monitor security events) is done by polling the Admin API log endpoints. Duo provides an official tool called **Duo Log Sync** for continuous log polling and forwarding to SIEMs, but this is a polling-based approach rather than a push-based event system.
