# <img src="logo.png" height="20"> Prisma

Manage Prisma Postgres projects, databases, connections, backups, and usage through the public REST API. Discover workspaces, projects, and available regions before provisioning, and inspect the authenticated user or service-token identity.

Connect with a workspace service token from Prisma Console **Settings → Service Tokens**, or OAuth with `workspace:admin` and `offline_access`. OAuth access tokens are refreshed automatically; service tokens remain valid until revoked. Provisioning may incur charges. Database and project deletion permanently removes data, and connection deletion revokes credentials.

List tools retrieve all pages when both `cursor` and `limit` are omitted; supply either to request one page and use the returned continuation cursor. Backup listings have a bounded recent-result limit because the API exposes no backup cursor. Usage reports operation counts and storage, preserving legacy optional fields where the current API does not report them.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
