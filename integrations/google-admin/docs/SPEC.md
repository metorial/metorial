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
| Alert Center       | `apps.alerts` (not requestable)     | —                                            |
| Groups settings    | `apps.groups.settings`              | —                                            |
| Licensing          | `apps.licensing`                    | —                                            |

All scopes are prefixed with `https://www.googleapis.com/auth/`.

`apps.alerts` is **not** on the OAuth consent list. The Alert Center API only
supports service accounts with domain-wide delegation, and the Google Auth
Platform rejects `apps.alerts` as an invalid scope for a user OAuth client
(confirmed 2026-09-03). The `manage_alerts` tool therefore cannot be satisfied by
this integration's user OAuth grant and is **not registered** on the provider
(commented out in `src/index.ts`). Its implementation is kept in
`src/tools/manage-alerts.ts`, with its `apps.alerts` clause, so a future
service-account auth method can register it again.

## Features

### User Management

Create, read, update, delete, and undelete user accounts within a Google Workspace domain. Supports managing user profiles (name, email, password, phone numbers, etc.), user photos, and custom user fields via schemas. Users can be searched and filtered by various attributes such as email, name, org unit, and more.

### User Alias Management

Create and manage email aliases for users, allowing them to send and receive mail from additional addresses.

### Group Management

Create, update, delete, and list groups within the organization. Manage group membership (add, remove, update member roles). Members can be users, other groups, or service accounts. Groups can be searched by name, email, or member.

### Group Settings

Use `get_group_settings` and `update_group_settings` to read and change group access, posting, and message moderation policies through the Groups Settings API. Partial updates change only the supplied fields.

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

Access and manage security alerts for the Google Workspace domain. Alerts cover threats like phishing, malware, suspicious login activity, and policy violations. Supports listing, retrieving, acknowledging alerts, and managing alert feedback and metadata. Requires a service account with domain-wide delegation, so the tool is implemented but not registered while the integration only offers user OAuth (see Authentication).

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

The implemented `user_lifecycle` group supports three exact Admin SDK Reports
API events: `user_created` (`CREATE_USER`), `user_suspended` (`SUSPEND_USER`), and
`user_deleted` (`DELETE_USER`). All belong to `applicationName=admin` and
`type=USER_SETTINGS`. Generic Directory user updates are not interpreted as
suspension. Group membership, login, security, and generic admin activity events
are outside this group's scope.

### Selection and authorization

Select the `customerId` returned by `get_customer_info` when enabling callbacks.
Selection is verified against the authenticated administrator's actual customer
and profile identity; a different customer or Google account cannot reuse a
saved channel or checkpoint. The group uses the audit-read, customer-read (or
customer-write), and user-profile-email OAuth scopes already declared by the
integration. Workspace admin privileges are required. Consumer Google accounts
cannot subscribe.

### Notification lifecycle and reconciliation

An automatic Reports `activities.watch` channel watches the selected customer's
admin activity with payload delivery enabled. Six-hour channels are replaced
one hour before their returned expiration; overlapping channels remain valid
until their own expiration. Initial registration requires an operation identity; retries use that identity to retain the
same channel ID; renewal retries also retain the same channel token. A replay
after the successful result is saved returns that result without another watch. If a watch succeeds but its response is lost, an unverifiable
provider conflict remains a retryable failure; no successful recovery is
invented. Such renewal failures leave the saved checkpoint available for
scheduled authenticated reconciliation even after the old channel expires.
Cleanup calls the Reports `channels.stop` API for every unexpired channel at
`https://admin.googleapis.com/admin/reports_v1/channels/stop`, as specified by
the discovery contract (the HTML method reference lists a conflicting path). Google provides no channel read/list API, so an unconfirmed 404 remains
a cleanup failure until the channel's independently recorded expiration.

Callbacks validate the saved channel secret (compared in constant time), channel
ID, resource ID, expiration, message number, and activity customer/application
identity. The `X-Goog-Resource-URI` header is not compared with the watch
response: Google describes it as API-version-specific, and its documented
notification example carries a query string (`?alt=json`) that the watch
response does not. The resource ID is the stable identity.
Google's callback protocol does not sign the body or provide a signed event
timestamp. A verified payload only wakes authenticated audit reconciliation;
business events always come from an authenticated `activities.list` response.
Sync callbacks and unrelated activity names produce no user event. A sync
message can arrive before the watch response is saved; scheduled reconciliation
still covers that race.

Reconciliation runs after relevant notifications and every 15 minutes. It reads
all pages for the three exact event names and examines every activity's
`events[]`, since an event-name filter can also return other events within the
same activity. Explicit failed, skipped, and unknown event statuses do not emit
completed lifecycle transitions; older records without a status remain supported.
The checkpoint advances only after every query/page succeeds;
permission, rate-limit, repeated-page-token, and malformed-page failures
preserve the previous checkpoint. One run reads at most 100 pages, stops at the
first page boundary after 2,500 events, and stops after 45 seconds. A run that
stops early returns the events read so far, records a warning, and saves the
window and page position; the next notification or reconciliation continues
that same window before a newer one starts, and the watermark advances when the
window is complete. If Google rejects the saved page position (400 or 410), a
warning is recorded and that event name is read again from its first page;
events already delivered are not repeated. Records are
validated one at a time: a record that cannot be read, a record that belongs to
another Workspace customer, a malformed event inside a record, or a lifecycle
event that does not name exactly one `USER_EMAIL` is skipped with a warning
naming the record's time and unique qualifier, and the remaining records are
still emitted. A skipped record stays inside the overlap window, so it is read
again for up to 24 hours and emitted if Google later returns it complete. A
record for another customer is never emitted. Outages resume from the persisted
watermark, up to Google's 180-day audit retention. Older checkpoints fail visibly
and require a fresh baseline. A checkpoint or start time up to five minutes
ahead of the reading host's clock is read as the current time, so hosts whose
clocks differ slightly can share a checkpoint; a larger gap fails as corrupt
state.

A 24-hour overlap catches late audit records. Persisted event identities suppress
duplicates within that window, including overlap between event queries and
renewed channels. At most the 10,000 most recent identities are kept; beyond
that, a repeat of an older event is suppressed only while the callback service's
deduplication window still holds its event ID. IDs hash customer, application, occurrence time, Google's
unique qualifier, normalized event data, and duplicate-element ordinal. The
identity never substitutes the administrator's email for the subject's
`USER_EMAIL`. New subscriptions start at registration time and emit no historical
baseline. Audit records delayed more than 24 hours or never recorded by Google
can be missed; neither push delivery nor these audit events guarantee immediate
or complete access-revocation detection.

### Output

For example, `user_suspended` maps to type `admin.user.suspended`:

```json
{
  "kind": "admin_user_lifecycle",
  "eventId": "stable-audit-event-hash",
  "customerId": "C01234567",
  "eventName": "SUSPEND_USER",
  "occurredAt": "2026-11-11T12:00:00Z",
  "userEmail": "departing-user@example.com",
  "actorEmail": "administrator@example.com",
  "actorProfileId": "administrator-profile-id"
}
```

`user_created` and `user_deleted` use types `admin.user.created` and
`admin.user.deleted` with the same output shape. Actor fields are optional;
subject email and the stable event ID are always present. Deleted-user events
need no subsequent lookup of a user that no longer exists.

### Verification boundaries

Root contract tests cover all three documented event families, malformed and
foreign callbacks, selection/identity, renewal and overlapping channels,
cleanup, pagination, audit fanout, delayed records, skipped unreadable records,
checkpoint failure safety, and deduplication. The private Workspace-admin suite includes a channel-only discover/register/renew/stop
scenario gated by the optional `userLifecycleCustomerId` fixture. It creates only
suite-owned channels using a reserved `.invalid` receiver. The suite remains
skipped with its original setup reason; the new scenario has not been run. No live users were created, suspended, or
deleted for trigger verification. Provider acceptance of watch/stop, real OAuth
permissions, real callback delivery, and deployed durable-state/renewal support
remain unverified. The production runtime must support persisted expansion
state, selection, renewal, and scheduled reconciliation before these triggers
are enabled.

Provider references:

- [Admin user events](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-user-settings)
- [Activities list and event arrays](https://developers.google.com/workspace/admin/reports/reference/rest/v1/activities/list)
- [Activities watch](https://developers.google.com/workspace/admin/reports/reference/rest/v1/activities/watch)
- [Push notifications, tokens, expiry, delivery limits](https://developers.google.com/workspace/admin/reports/v1/guides/push)
- [Reports discovery contract, including channel stop and event status](https://admin.googleapis.com/$discovery/rest?version=reports_v1)
- [Audit lag and retention](https://knowledge.workspace.google.com/admin/reports/data-retention-and-lag-times)
