# Make API coverage

The supported API is `/api/v2` on the six documented Make/Celonis regional hosts. New connections persist the host, authentication mode and natively verified user ID. The supported identity is regional `GET /users/me`, not a decoded token. Configuration has no duplicate host field; stored legacy `zoneUrl` is retained as a fallback, and conflicting saved regions are refused.

| Capability | Tools and native operations |
| --- | --- |
| Identity and containers | `get_current_user`, `list_organizations`, `list_teams`, `list_users` |
| Scenarios | `list_scenarios`, `create_scenario`, `manage_scenario` exact get/patch/start/stop/run/clone/delete/blueprint/usage |
| Execution | `get_scenario_logs`, `get_execution_status` exact native execution GET |
| Connections | `list_connections`, `manage_connection` get/rename/test/delete |
| Persistent data | `list_data_stores`, `manage_data_store`, `manage_data_store_records`, `list_data_structures` |
| Hooks | `list_hooks`, `manage_hook` get/create/rename/enable/disable/ping/delete |
| Usage and files | `get_usage`, `download_blueprint` |

Native receipts must contain the exact resource ID or requested key, boolean verification/state values and valid required arrays. Malformed successful writes remain uncertain; callers must reconcile before retrying. HTTP failures are adapted to safe user-facing errors without retaining transport parents. Configured credential reflection is refused before returning data or file content. Requests have finite time/body limits and do not follow redirects.

Native pagination uses `pg[limit]`/`pg[offset]`; no fabricated totals are exposed. The record exact-key scan requires native total-count and paging completeness to infer absence. The current primary record OpenAPI blocks document collection GET/POST/DELETE and keyed PUT/PATCH, so the integration does not guess keyed GET/DELETE routes. Hook list metadata has no documented native pagination parameters; bounded local selection preserves the existing limit/offset fields.

Blueprint download transforms the documented JSON response into a bounded existing JSON file. No new export job, arbitrary-origin fetch, temporary URL lifetime or renewal endpoint is assumed. All legacy tool keys and input fields remain; native requirements are enforced before requests with actionable discovery guidance.

Private verification uses independently authorized synthetic fixtures, native identity and exact container checks, complete original credential/config/fixture binding, nonce ownership and independent state reads. It can own inactive empty-flow on-demand scenarios, non-strict stores/nonce records and unassigned empty-queue hooks. Cleanup confirms trash or native collection absence and preserves drifted resources. It does not execute or activate scenarios, send hook payloads, or delete a pre-existing third-party connection. Existing execution reads and linked API verification need distinct fixture authorization. History, trash, quota and payload retention require explicit acknowledgment.

Primary references: [Users/me](https://developers.make.com/api-documentation/api-reference/users/me), [Organizations](https://developers.make.com/api-documentation/api-reference/organizations), [Teams](https://developers.make.com/api-documentation/api-reference/teams), [Users](https://developers.make.com/api-documentation/api-reference/users), [Connections](https://developers.make.com/api-documentation/api-reference/connections), [Data stores](https://developers.make.com/api-documentation/api-reference/data-stores), [Data structures](https://developers.make.com/api-documentation/api-reference/data-structures), [Hooks](https://developers.make.com/api-documentation/api-reference/hooks), [Pagination](https://developers.make.com/api-documentation/pagination-sorting-filtering/pagination-and-sorting), and the scenario, log, blueprint and OAuth sources linked in README.
