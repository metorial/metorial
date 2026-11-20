# <img src="logo.svg" height="20"> Google Admin

Manage Google Workspace organizations programmatically. Create, update, delete, and search users, groups, and organizational units. Manage user aliases, group memberships, and group settings. Assign and revoke admin roles and privileges. Manage ChromeOS and mobile devices including remote actions like wipe and deprovision. Add and manage domains and domain aliases. Assign, update, and revoke product licenses. Access audit logs and usage reports for admin actions, logins, Drive activity, and device events. Monitor and respond to security alerts for phishing, malware, and suspicious activity. Transfer data ownership between users. Manage calendar resources such as meeting rooms and equipment. Configure SSO and email routing settings. Manage Chrome printers and shared contacts.

## User lifecycle events

Enable callbacks with the Workspace `customerId` returned by `get_customer_info`.
The connected administrator must have audit-report and customer-read privileges,
the corresponding OAuth scopes, and access to their Google profile identity.

Three events report exact administrator actions from the Reports API:

- `user_created`: `CREATE_USER`, for onboarding and provisioning.
- `user_suspended`: `SUSPEND_USER`, for offboarding and access review.
- `user_deleted`: `DELETE_USER`, for account cleanup.

The integration creates and renews an HTTPS notification channel automatically.
Authenticated audit reconciliation also runs every 15 minutes. New subscriptions
start at connection time; existing users are not emitted as newly created.
Events include a stable `eventId`, `customerId`, `eventName`, `occurredAt`, and
the subject's `userEmail`. Optional `actorEmail` and `actorProfileId` identify
the administrator separately from the affected user.

Audit logs can arrive late or be absent. A persistent checkpoint and 24-hour
overlap recover missed notifications and deduplicate repeated audit records;
records delayed beyond that overlap can be missed. An audit record that cannot
be read or belongs to another Workspace customer, or a lifecycle event that
does not name exactly one user, is skipped with a warning instead of blocking
later events. These notifications do not
provide immediate or guaranteed access revocation. Runtime support for durable
checkpoints, webhook expansion, scheduled reconciliation, and channel renewal
must be deployed before enabling them. Live Workspace registration and callback
delivery have not been verified by the fixture contract suite.

See the [event contract](docs/SPEC.md#events) and Google's
[admin user event reference](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-user-settings).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
