# Klipfolio Klips API

This integration targets the current Klips REST API at `https://app.klipfolio.com/api/1.0`. PowerMetrics is a separate product/API; embedding and metric-management operations are not part of these tools.

API keys use the `kf-api-key` header and inherit their issuing user's permissions. Key generation requires the applicable account permission. Reads and writes may require different permissions, including `dashboard.library`, `tab.build`, `tab.edit`, `tab.share`, `tab.publish`, `datasource.edit`, and `user.manage`. Agency client operations and account allowances depend on the account plan.

The 26 tools cover:

- Profile identity; paginated discovery of clients, dashboards, Klips, data sources, stored instances, users, roles, groups and published links.
- Dashboard creation/deletion, metadata, layout, Klip membership and group sharing. A layout replaces the full layout and removes omitted Klips.
- Klip creation/update/deletion and schema read/update.
- Connector creation/update/deletion, credential-concealed properties, stored data downloads, and queued refresh/enable/disable operations.
- User lifecycle, role permissions, group memberships and default dashboard assignments. User creation requires role IDs; welcome email is disabled unless explicitly requested.
- Published link creation/update/deletion. `isPublic: false` disables public search but does not require a password. Provide a password for restricted access. Listing requires a dashboard ID. The retained `description` field is unsupported by the documented published-link API; omit it and use `name`.

Page limits are integers from 1 to 100 (default 25), offsets are nonnegative integers, and `nextOffset`/`hasMore` allow continuation. Published links are scoped to one dashboard. Positive scheduled refresh intervals must be at least 60 seconds; 0 disables scheduled refresh. The API rate limit is 5 requests/second per account, with additional plan-specific daily allowances. A single multi-request operation is paced; independent callers must still coordinate account usage. No writes are automatically retried.

`download_datasource_instance_data` returns a downloadable file containing the decoded API data value. Strings preserve the returned content; structured JSON is serialized. The optional format selects file metadata and does not convert the source. The unchanged, deprecated `get_datasource_instance_data` tool retains its historical optional columns/rows contract; current raw source content may not contain those fields.

Echoed API keys are concealed in returned values and JSON property names, including downloaded data. Resource reads verify the requested ID. External IDs remain arbitrary caller strings in metadata and filters; they are distinct from provider resource IDs.

Multiple writes in one invocation run sequentially and do not roll back earlier successful requests if a later request fails. Connector creation can immediately contact an external endpoint. User seats, client provisioning, publication and refresh usage require appropriate account allowances and careful authorization. No billing activation, PowerMetrics embedding, connector OAuth registration or file upload operation is exposed. Legacy triggers are absent.

Official references:

- [Getting started, authentication, limits and pagination](https://apidocs.klipfolio.com/reference/getting-started)
- [Dashboards](https://apidocs.klipfolio.com/reference/tabs), [layouts](https://apidocs.klipfolio.com/reference/tab-layout), [Klip instances](https://apidocs.klipfolio.com/reference/tab-klip-instances), [sharing](https://apidocs.klipfolio.com/reference/tab-share-rights)
- [Klips](https://apidocs.klipfolio.com/reference/klips)
- [Data sources](https://apidocs.klipfolio.com/reference/data-sources), [connector properties](https://apidocs.klipfolio.com/reference/data-source-properties), [instances](https://apidocs.klipfolio.com/reference/data-source-instances), [stored data](https://apidocs.klipfolio.com/reference/data-source-instances-data), [refresh](https://apidocs.klipfolio.com/reference/data-source-instance-operations)
- [Users](https://apidocs.klipfolio.com/reference/users), [roles](https://apidocs.klipfolio.com/reference/roles), [permissions](https://apidocs.klipfolio.com/reference/role-permissions), [groups](https://apidocs.klipfolio.com/reference/groups), [default dashboards](https://apidocs.klipfolio.com/reference/groups-default-tabs)
- [Published links](https://apidocs.klipfolio.com/reference/published-links), [profile](https://apidocs.klipfolio.com/reference/profile)
