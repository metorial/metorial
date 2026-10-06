# Appsmith integration contract

The package retains all thirteen public keys and legacy input field types. `manage_application` adds `get`, resolved from the native authorized base-application inventory. No triggers are registered. This integration relies on dashboard session APIs whose stability and availability depend on the installed instance version and edition.

| Keys | Native behavior |
| --- | --- |
| `check_health`, `get_instance_info` | Public health and allowlisted instance fields; explicit origin when unauthenticated. |
| `get_current_user` | Exact authenticated `/users/me`, with positive ID/email and optional stored user binding. |
| `list_workspaces`, `manage_workspace` | Native home discovery, exact get/members, create/update readback, archive acknowledgement. |
| `list_applications`, `manage_application` | Native base-application discovery; create/update/delete/publish/clone/fork/get; exact parent and receipt checks. Public access uses `changeAccess`. |
| `export_application`, `import_application` | Bounded downloadable sanitized export; legacy input supports JSON object/text; native multipart file import with CSRF. |
| `list_pages`, `list_datasources` | Current native edit-mode page listing and workspace-filtered datasource metadata. No query execution or credential management. |
| `trigger_workflow` | Same-instance opaque native webhook credential, HTTP acknowledgement with optional run ID; completion not confirmed. |
| `query_audit_logs` | Preserved deprecated schemas and local unsupported-operation refusal; Business dashboard remediation. |

Session login obtains XSRF-TOKEN, sends X-XSRF-TOKEN on form login, requires native SESSION issuance, then verifies the same user. New output binds the exact instance and user. Legacy stored token/configuration fallback remains usable but cannot establish historical issuance proof. There is no generic bearer-token grant or invented identity API.

Lists are native unpaginated arrays with a 1,000-record guard. Known absent optional fields are omitted. HTTP 202/204 are not accepted as completed management writes. Native envelope success, status, resource identity, workspace and requested values must match. Updates consisting of multiple native writes can partially apply; inspect before retrying.

Export removes known plaintext credential fields and guards configured session reflections. Remaining application definitions can contain sensitive business data. Import refuses credential fields instead of silently reusing them. Export size is limited to 4 MiB; response transport bounds are 8 MiB, with no redirects.

The active private suite requires exact expected instance/user fixtures, gates retained archives, imports/exports, publication and downstream workflow effects, and independently verifies full current inventories and unchanged inert application definitions before cleanup. Resource archival is not historical erasure. Uncertain writes without a trustworthy receipt require manual reconciliation. No live operation has been performed during implementation.
