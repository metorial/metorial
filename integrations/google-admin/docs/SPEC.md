Now let me get more details on the Reports API push notifications and Alert Center:Now I have enough information to write the specification.

# Slates Specification for Google Admin

## Overview

Google Admin (Admin SDK) is a collection of APIs that enable administrators to programmatically manage Google Workspace organizations. It provides capabilities for managing users, groups, devices, organizational units, roles, domains, licenses, audit logs, and security alerts. The SDK encompasses several sub-APIs including the Directory API, Reports API, Alert Center API, Groups Settings API, and others.

## Authentication

Google Admin uses **OAuth 2.0** for authentication. There are two primary methods:

### OAuth 2.0 (Three-legged, for user-based access)

1. Create OAuth 2.0 credentials (Client ID and Client Secret) in the Google Cloud Console.
2. Enable the "Admin SDK API" in the API Library.
3. Configure the OAuth consent screen.
4. The authenticating user must be a Google Workspace administrator with appropriate privileges.

**Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
**Token endpoint:** `https://oauth2.googleapis.com/token`

### Service Account with Domain-Wide Delegation (for server-to-server access)

1. Create a service account in Google Cloud Console and download the JSON key file.
2. In the Google Admin Console, navigate to **Security → Access and data control → API controls → Manage Domain Wide Delegation**.
3. Add the service account's Client ID and authorize the required OAuth scopes.
4. The service account must impersonate a super admin user (using the `subject` field) when making API calls.

### Scopes

Scopes are granular and follow the pattern `https://www.googleapis.com/auth/admin.*`. Key scope categories include:

| Category           | Read/Write Scope                    | Read-Only Scope                              |
| ------------------ | ----------------------------------- | -------------------------------------------- |
| Users              | `admin.directory.user`              | `admin.directory.user.readonly`              |
| User aliases       | `admin.directory.user.alias`        | `admin.directory.user.alias.readonly`        |
| Groups             | `admin.directory.group`             | `admin.directory.group.readonly`             |
| Group members      | `admin.directory.group.member`      | `admin.directory.group.member.readonly`      |
| Org units          | `admin.directory.orgunit`           | `admin.directory.orgunit.readonly`           |
| Roles              | `admin.directory.rolemanagement`    | `admin.directory.rolemanagement.readonly`    |
| ChromeOS devices   | `admin.directory.device.chromeos`   | `admin.directory.device.chromeos.readonly`   |
| Mobile devices     | `admin.directory.device.mobile`     | `admin.directory.device.mobile.readonly`     |
| Domains            | `admin.directory.domain`            | `admin.directory.domain.readonly`            |
| Customers          | `admin.directory.customer`          | `admin.directory.customer.readonly`          |
| Calendar resources | `admin.directory.resource.calendar` | `admin.directory.resource.calendar.readonly` |
| Custom schemas     | `admin.directory.userschema`        | `admin.directory.userschema.readonly`        |
| User security      | `admin.directory.user.security`     | —                                            |
| Reports (audit)    | —                                   | `admin.reports.audit.readonly`               |
| Reports (usage)    | —                                   | `admin.reports.usage.readonly`               |
| Alert Center       | `apps.alerts`                       | —                                            |
| Groups settings    | `apps.groups.settings`              | —                                            |
| Licensing          | `apps.licensing`                    | —                                            |

All scopes are prefixed with `https://www.googleapis.com/auth/`.

## Features

### User Management

Create, read, update, delete, and undelete user accounts within a Google Workspace domain. Supports managing user profiles (name, email, password, phone numbers, etc.), user photos, and custom user fields via schemas. Users can be searched and filtered by various attributes such as email, name, org unit, and more.

### User Alias Management

Create and manage email aliases for users, allowing them to send and receive mail from additional addresses.

### Group Management

Create, update, delete, and list groups within the organization. Manage group membership (add, remove, update member roles). Members can be users, other groups, or service accounts. Groups can be searched by name, email, or member.

### Group Settings

Configure detailed group behavior such as who can post, who can join, message moderation policies, and email delivery settings. This is handled through the separate Groups Settings API.

### Organizational Unit Management

Create and manage the hierarchical organizational unit (OU) structure. OUs are used to apply policies and configurations to subsets of users and devices. Users and devices can be moved between OUs.

### Role and Privilege Management

Create custom admin roles, assign roles to users, and manage role-based access control. List available privileges and view existing role assignments.

### Device Management

Manage ChromeOS devices (list, update, move between OUs, deprovision, perform remote actions) and mobile devices (list, get, approve, block, wipe, delete). Chrome browser instances can also be managed. Devices can be searched using various filters.

### Domain Management

Add, list, and delete domains and domain aliases associated with the Google Workspace account.

### Customer Management

Retrieve and update customer-level account information for the Google Workspace organization.

### Calendar Resource Management

Manage calendar resources such as meeting rooms and equipment (buildings, features, calendar resources). These resources appear in Google Calendar for booking.

### Audit and Activity Reports

Access detailed audit logs for admin actions, user logins, Drive activity, device events, and OAuth token grants via the Reports API. Also retrieve usage reports showing application adoption and usage statistics at the customer, user, and entity levels.

### Alert Center

Access and manage security alerts for the Google Workspace domain. Alerts cover threats like phishing, malware, suspicious login activity, and policy violations. Supports listing, retrieving, acknowledging alerts, and managing alert feedback and metadata.

### Data Transfer

Transfer ownership of application data (Drive files, Calendar, etc.) from one user to another, typically used during offboarding.

### Contact Delegation

Manage contact delegation, allowing users to delegate access to their contacts to other users.

### Groups Migration

Migrate email messages into Google Groups from external systems.

### License Management

Assign, update, and revoke Google Workspace product licenses for users via the Enterprise License Manager API.

### Admin Settings (SSO and Email Routing)

Configure domain-level settings including single sign-on (SSO) configuration and inbound/outbound email routing (gateway) settings.

### Domain Shared Contacts

Manage external (non-domain) shared contacts that appear in the organization's directory. Supports creating, listing, updating, and deleting shared contacts and their photos.

### Chrome Printer Management

Create and manage printers and print servers for ChromeOS devices within the organization.

## Events

The Google Admin SDK supports webhook-based push notifications for two main areas:

### Directory API — User Change Events

Subscribe to real-time notifications when user resources change within a domain or customer account. You set up a notification channel (webhook) by calling the `users.watch` method.

- **Supported event types:** `add` (user created), `delete` (user deleted), `makeAdmin` (admin status changed), `undelete` (user restored), `update` (user updated).
- **Parameters:** You must specify either a `domain` or `customer` to scope the watch, and an `event` type to filter on. Each channel requires a unique `id`, a `type` of `web_hook`, and an HTTPS `address` for the callback URL.
- **Considerations:** Channels have an expiration time and must be renewed manually before expiry. The receiving URL must have a valid SSL certificate. Only the Users resource is supported for push notifications in the Directory API.

### Reports API — Activity Events

Subscribe to push notifications for activity report changes (audit events). You set up a notification channel on the Activities resource to be notified when new audit log entries are recorded.

- **Supported activity types:** Admin audit, user logins, Drive activity, mobile device events, OAuth token grants, and other application-specific activity types.
- **Parameters:** Requires a channel `id`, `type` of `web_hook`, and an HTTPS callback `address`. You can specify a `ttl` (time-to-live) for channel expiration.
- **Considerations:** The maximum channel expiration is 6 hours (21,600 seconds), after which the subscription must be renewed. Some activity data may have lag times ranging from a few minutes to 1–3 days depending on the event type.
