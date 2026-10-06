# Tray API coverage

The 17 existing tool keys remain supported. Two read tools add credential context and exact resource metadata. Legacy event subscriptions have been removed.

| Capability | Tools | API and prerequisites |
| --- | --- | --- |
| Connector catalog and schemas | `list_connectors`, `get_connector_operations` | Regional Platform REST; native service mapping identifies service environments |
| Connector execution | `call_connector` | User token, existing authentication, operation-specific input; billable and may have irreversible effects |
| External users and tokens | `list_users`, `create_user`, `delete_user`, `generate_user_token` | Embedded GraphQL master token; optional native test-user creation; authorized user tokens expire after two days |
| Solutions | `list_solutions` | Embedded GraphQL master token; template IDs, configuration slots and native page metadata |
| Solution instances | `list_solution_instances`, `get_solution_instance`, `create_solution_instance`, `update_solution_instance`, `delete_solution_instance`, `upgrade_solution_instance` | User or master reads; user-only mutations. Exact reads use bounded native pagination, never an undocumented ID filter. Version flags and slot values govern upgrades |
| Service authentications | `list_authentications`, `create_authentication`, `delete_authentication` | Embedded GraphQL creation/list plus Platform REST metadata/removal; imports existing credentials without disclosing them |
| Discovery | `get_current_context`, `get_resource` | Authorized context read without human identity; exact user/solution/authentication metadata with corresponding permissions |

Regions bind GraphQL and REST to documented US, EU or APAC hosts. Credentials are never sent to a caller-supplied URL. New auth inputs own the region; saved legacy config is a validated fallback. Existing names, keys and recursively typed fields are retained, with optional native discovery and pagination fields added.

GraphQL partial errors, invalid receipts, unsafe numeric values, credential reflections, stalled or incomplete pages and pending HTTP outcomes are errors. Safe native creation IDs are retained for reconciliation. A null mutation marker does not prove deletion; exact absence must be read back. No automatic retries, token refresh, invented identity, files or workflow execution endpoints are added.

Removal may retain billing, audit history, workflow executions and third-party changes. A failed readback does not imply rollback. Controlled verification requires isolated accounts, original credential/region/fixture binding, unique markers, native ownership and complete reference checks before cleanup; unavailable proof requires manual reconciliation.

References: [Embedded authentication](https://tray.ai/documentation/developer/embedded-apis/authentication), [users](https://tray.ai/documentation/developer/embedded-apis/users), [solutions](https://tray.ai/documentation/developer/embedded-apis/solutions), [instances](https://tray.ai/documentation/developer/embedded-apis/solution-instances), [authentications](https://tray.ai/documentation/developer/embedded-apis/authentications), [call connector](https://tray.ai/documentation/developer/embedded-apis/call-connector), [Platform connectors](https://tray.ai/documentation/developer/platform-apis/connectors), [Platform authentications](https://tray.ai/documentation/developer/platform-apis/authentications).
