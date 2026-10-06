# JumpCloud

Read authorized directory users, devices, groups, applications, organizations, command definitions/results and Directory Insights. Administrative keys manage users/devices/groups, memberships, supported graph relationships and remote commands. Nineteen tools retain all seventeen previous keys; get_resource and list_organizations complete exact read/discovery workflows. No current-human identity is inferred from API keys or service accounts.

Choose the correct US, EU or India API-key region. A connection can fix an organization ID; an explicit tool organization cannot override it. Older stored configuration orgId values remain a fallback when auth has no fixed organization. Discovery does not confer MSP or cross-organization authority.

For the documented US API service account grant, choose grantMode administrator. It requests scope api at admin-oauth.id.jumpcloud.com and uses Bearer access tokens with documented expiration and original-client renewal. Service account permissions are provider-enforced; MSP endpoints, bulk users and custom emails are not supported. EU/India service account grant hosts are not assumed. Historical service_account connections without grantMode preserve the previous empty-scope oauth.id.jumpcloud.com grant and x-api-key behavior as unverified compatibility; explicitly reconnect to migrate, rather than silently changing saved credentials.

V1 list responses require native results and totalCount. V2 group/relationship arrays have no invented total. Directory Insights reuses the same organization/services/time window and native continuation array; a cursor can exist on the final page. Native count/limit headers determine whether another page may exist. Limits are bounded locally; they do not guarantee a provider-wide complete inventory.

Updates to native full-replacement groups and commands read the exact current resource and preserve documented writable settings. Native command systems is not used: nonempty legacy input is refused, with guidance to explicitly bind devices through system-to-command associations. Linux/Mac commands need a native run-as user ID. Scheduling, triggers, access changes and user actions may cause retained or future effects. Native acknowledgements do not prove execution, delivery, effective access or downstream propagation; reconcile uncertain effects before retrying. Sudo attributes are accepted only on documented user/system graph routes.

Command result requestTime is optional because the native API permits null; native error is mapped from response.error. The legacy commandId output retains the native command value, which the documentation describes as the executed command rather than a verified command identifier.

Private coverage reads exact, operator-authorized fixtures and independently verifies native receipts. Administrative scenarios stop before effects when complete associated-state ownership and cleanup cannot be proved. Offline checks are not a live acceptance claim. No files, exports or triggers are exposed in this bounded refresh.

Primary contracts: [V1](https://docs.jumpcloud.com/api/1.0/index.html), [V2](https://docs.jumpcloud.com/api/2.0/index.html), [Directory Insights](https://docs.jumpcloud.com/api/insights/directory/1.0/index.html), [API service accounts](https://jumpcloud.com/support/service-account-for-apis-direct-orgs).
