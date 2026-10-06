# OneLogin

Use tenant-bound API credentials to read and manage OneLogin users, roles and SSO applications, inspect groups and audit events, and enroll or verify supported MFA factors. The API credential scope determines access; an API account ID identifies the account, not a signed-in person.

The integration has 19 tools. Existing user/app/role operations and MFA keys are retained, with exact `get_role` and `get_group` reads added. List tools return one native page and expose the provider's next cursor; repeat filters when continuing. Omit unused filters; explicitly empty filters or invalid numeric IDs are refused before a search. Users, apps, roles, groups and registrations use exact native IDs.

Connect with an API client ID, secret and tenant subdomain. Token renewal reuses the original tenant and credential pair, using the documented client-credentials grant and native `created_at`/`expires_in` lifetime. Existing unmarked token connections can use their configured subdomain; renewal requires reconnecting because those outputs lack an original credential binding.

Role updates support name only. The retained apps/users/admins update fields are refused before any change; use OneLogin's dedicated association APIs or admin console. User mappings and provisioning can run asynchronously after an acknowledgment, and removing direct roles does not remove roles supplied through mapping or provisioning. Deletions and MFA operations can leave audit history, notifications or indirect account effects.

App reads may intentionally return native SSO configuration secrets. MFA enrollment returns native setup data when OneLogin supplies it; keep verification tokens and TOTP setup URLs private. These are requested resource outputs, distinct from connection credentials. Supported MFA factors and enrollment lifecycle depend on the user's policy and API permissions. Pre-verification requires the existing phone or email contact for the selected SMS, OneLogin Voice or OneLogin Email factor. A conflicting returned authenticator family is refused; reconcile any enrollment before retrying. The two MFA inventory reads are not atomic.

This package does not implement person login/session generation, authorization-server administration, Smart Hooks, SCIM server endpoints, group mutations, directory synchronization or triggers. No download/export endpoint is claimed. API fidelity and limitations are recorded in [the capability specification](docs/SPEC.md).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
