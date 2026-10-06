# Xata

Discover current Xata organizations and projects, inspect Postgres branches, and create, rename, hibernate, wake or delete child branches. Connect with a current API key from [the Xata console](https://console.xata.io). The key needs `org:read` for connection discovery and the project/branch read or write scopes used by the selected tools. Organization roles and key restrictions also apply.

Xata Lite was [permanently retired on February 28, 2026](https://github.com/xataio/client-ts). The 24 original Lite tool contracts remain visible as deprecated operations and fail with retirement guidance before contacting the retired service. Their workspace/database/record semantics are not remapped to current Postgres operations. The old Lite OAuth flow is unavailable; use a current API key.

Current platform tools use separate organization, project and branch IDs. `list_organizations` discovers organizations; `list_projects` and `get_project` inspect their projects. The project-branch tools list/read branches, provision a child from an explicit parent, update name/description/hibernation/scale-to-zero, and permanently delete a branch. Lists return complete accessible collections and their returned counts; branch metadata omits database credentials.

Child branches inherit the parent's data and configuration. Provisioning and waking branches can incur compute/storage charges, and hibernation changes availability. Creation and compute changes are asynchronous: inspect `get_project_branch` to check the current state. Disable automatic scale-to-zero before manually hibernating. Verify the organization, project and branch before deletion, which cannot be undone. Native PostgreSQL clients provide record, schema, search and transaction access; those operations and database credentials are outside this integration's current tool surface.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
