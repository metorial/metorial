# LastPass Enterprise API

Seven tools retain their original public keys and input field names. Requests POST JSON to `https://lastpass.com/enterpriseapi.php` with integer `cid`, secret `provhash`, command `cmd` and native `data`. No OAuth or bearer vault endpoint is inferred. The separate REST API uses `Authorization: Api-Key lpkey_...` and requires early-access enrollment; it is not substituted for this API.

| Public key | Native command and contract |
| --- | --- |
| get_users | `getuserdata`: exact username plus native `pagesize` / zero-based `pageindex`, optional disabled/admin 0/1 filters. Native `Users`, `Groups`, `Invited`, `total` and `count`. |
| get_shared_folders | `getsfdata` with `data: "all"`; numeric-ID folder map and numeric recipient permissions. No vault site or secret content read. |
| get_event_report | `reporting`: from/to, user/search, optional admin and microsecond `next` timestamp. Up to 10,000 events per request; account-local times use oldest admin, or oldest user if no admin exists. |
| provision_users | `batchadd`: user array containing username, optional fullname/groups. Accepts native status without inventing per-user receipt. Notifications/history can remain. |
| deprovision_user | `deluser`: username and deleteaction 0 deactivate, 1 remove company membership, 2 permanent account/vault deletion. No default escalation or transfer claim. |
| manage_user | `resetpassword` / `disablemultifactor`: username object and OK/WARN receipt; `disableuser`: email array and `success`, disabled_users/unchanged_users receipt. Sequential, non-atomic. |
| manage_group_membership | `batchchangegrp`: username/add/del array, OK/WARN and optional errors. Read current memberships to reconcile warnings. |

Missing status is accepted only for the documented typed read payloads, not as a mutation confirmation. Unknown HTTP/logical status, invalid shape and ambiguous native disable receipts raise actionable service failures. Native warnings do not imply full success. Known configured provisioning-hash reflections are refused; public failures discard raw transport parents. Shared internal tracing is a separate layer and is not universally claimed to sanitize unknown secrets or every encoding.

There is no suitable identity endpoint in this Enterprise command surface. CID is configured account context. No file-delivery capability or renewal is invented. No old triggers remain.

Current official support pages were read publicly on 2026-10-06, including user data (updated 2026-07-22), provisioning (updated 2026-06-19), shared folders, reporting, batch groups, deletion, password reset, MFA disable and user disable. See the implementation report for exact sources and offline verification evidence.
