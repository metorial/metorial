# Appsmith

Thirteen tools cover instance health and public configuration, verified current users, workspace and base-application discovery, workspace/application lifecycle operations, application JSON download/import, page and datasource metadata, and native workflow acknowledgements.

Management uses Appsmith’s version-sensitive dashboard session API, not a stable public management API. Connect to the exact HTTPS instance origin using a native password account. Login obtains the native CSRF cookie, verifies the issued session against `/users/me`, and binds its instance and user. SSO-only accounts cannot use password login. Failed attempts can lock an account for 24 hours. Existing stored sessions retain their original `token` and legacy instance configuration fallback; reconnect to establish stronger instance/user binding.

Unauthenticated health and instance-information calls accept an explicit instance origin. A connected session cannot be redirected to a different origin. Discovery follows current `/workspaces/home` and `/applications/home` routes; these return native unpaginated inventories, bounded to 1,000 records. Application exact reads resolve only authorized base applications, not arbitrary Git branches. Native omitted fields remain omitted.

Application updates preserve `false` public access through the dedicated `changeAccess` route. Name and public-access updates are separate writes; a later failure can leave an earlier change applied. Writes require exact native receipts and independent reads. Publication acknowledges the native publish action and does not prove external query execution. Workspace deletion archives records; history and downstream effects can remain.

Export produces a downloadable JSON file of at most 4 MiB after known `decryptedFields` and `invisibleActionFields` are removed. Query text, widget configuration, Git metadata and embedded business data can remain sensitive. The legacy `applicationJson` output field is optional and omitted. Import accepts export JSON text or an object, refuses populated known credential fields, and sends the native multipart `file` part with a fresh CSRF prerequisite. Reconfigure datasources after import.

Workflows require self-hosted Business support and a controlled native webhook URL from the same instance. The URL carries its own credential; no session cookie is forwarded. Responses distinguish HTTP acknowledgement (including 202) from completion. Check native run history; no cancellation, refund or reversal is promised.

The retained `query_audit_logs` contract is deprecated and refuses locally because its historical route/filters are unverified against the current enterprise API contract. Business users can use **Admin Settings > Others > Audit logs**. This does not assert when an enterprise route was removed.

The private suite is active and statically checked, with offline intercepted SDK and ownership evidence. Live provider acceptance, edition availability, session rotation, multipart uploads, downloaded bytes and resource retirement require a controlled profile and remain unverified.
