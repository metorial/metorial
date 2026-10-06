# LastPass

Manage administrative user metadata, group memberships, shared-folder permissions and audit reports through the LastPass Enterprise API. This integration uses a company ID and Enterprise provisioning hash. It does not read vault contents, passwords, shared-folder sites or downloadable vault files.

Configure the account number from the Admin Console account menu and the provisioning hash from **Advanced > Enterprise API**. These credentials identify a configured company; they do not verify a current person. Resetting the hash invalidates its previous value. AD Connector keys and the separate early-access REST API `lpkey_` keys do not authenticate this API.

| Tool | Behavior |
| --- | --- |
| Get Users | Exact email lookup or one page of user metadata; follow `nextPageIndex` when native total confirms more results. Maximum 2,000 users per page. |
| Get Shared Folders | Administrative folder IDs, names, available security scores and recipient permissions; numeric permissions are decoded accurately. |
| Get Event Report | Up to 10,000 events in the account reporting time zone; pass the native `next` timestamp to continue. |
| Provision Users | Submit new users, names and groups. Invitations and audit history can remain after the call. |
| Deprovision User | Deactivate retains membership/data; remove retains a personal account and vault; delete permanently removes the account and vault. |
| Manage User | Send reset email, disable MFA, or disable an account. Combined actions run sequentially and report earlier receipts if a later action fails. |
| Manage Group Membership | Submit additions/removals. Group membership can grant access beyond administrative metadata. |

`WARN` is a partial or uncertain result, never a claim that every requested change completed. Inspect native warnings and current user state before retrying; writes are not automatically retried. Missing native fields remain omitted. A timeout, malformed receipt or failed later action does not prove that earlier actions or notifications were reversed.

Requires a LastPass Business account with the Enterprise API enabled and appropriate administrative permissions. Provisioning does not manage groups for preconfigured SSO applications. The separate REST API remains early access and is outside this integration.

The private suite is active and live-unverified. Read scenarios require an explicitly configured company, controlled existing user and bounded reporting interval. Real administrative mutations are gated before effect because this API cannot prove complete vault/sharing/policy ownership or reverse emails, MFA resets and audit history. No cleanup guarantee is inferred from a user disappearing from a metadata page.

Official reference: [Enterprise API user data](https://support.lastpass.com/s/document-item?bundleId=lastpass&topicId=LastPass%2Fapi_get_user_data.html&_LANG=enus), [Enterprise API commands](https://support.lastpass.com/s/document-item?bundleId=lastpass&topicId=LastPass%2Faccess_the_documentation_of_the_enterprise_api.html&_LANG=enus), [separate REST API quick start](https://developer.lastpass.com/content/quick-start.md).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
