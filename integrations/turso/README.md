# <img src="logo.svg" height="20"> Turso

Manage Turso Cloud organizations, groups, databases and credentials through the Platform API. Discover the authenticated user and authorized organizations before choosing an organization for database, group, member and audit operations. Existing connections can continue using their saved organization.

Use a **Platform API token**, preferably restricted to an organization. Database and group SQL tokens authenticate database SDK/HTTP connections and cannot replace the Platform API token. Group-scoped Platform tokens require an organization, a group and explicit permissions; unrestricted Platform tokens are deprecated by Turso but existing tokens remain supported for now.

The integration lists, creates, retrieves, configures and deletes databases and groups; reads usage, query statistics, instances, invoices and subscriptions; manages members and pending invitations; creates and rotates SQL credentials; and manages Platform API tokens. Audit logs support page/pageSize; list APIs without pagination return the provider's collection.

Regional replicas, Multi-DB Schemas and ATTACH are retained for eligible existing paid users. They are unavailable to new users under Turso's published feature changes. Dump URL seeding remains in the official SDK although the current OpenAPI instead describes database-file upload; availability depends on the account/API deployment. No SQL execution, database-file upload or export tool is exposed by this integration.

Current API responses may omit older database/group status fields. Those fields are returned only when the provider supplies them; missing status is not inferred. Database creation can return only its name, ID and hostname. Invoice metadata contains the provider PDF link when available.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
