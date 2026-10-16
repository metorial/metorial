# <img src="logo.jpg" height="20"> Borneo

Manage sensitive-data scans, inspection results, connected accounts, and privacy operations records in your Borneo deployment. Maintain breach records, processing activities, DPIAs, recipients, assets, employees, departments, office locations, domains, legal documents, and dashboard users. Download inventory exports, processing-activity exports, and dashboard reports.

Connect with your deployment's HTTPS API endpoint and a Borneo API bearer token. Existing saved deployment URLs remain supported. Use `get_current_user` to discover authorised organisations, `list_accounts` and `list_connectors` to discover scan targets, and `list_scan_iterations` to find detailed scan executions.

List operations return the provider's continuation token when available. Supply `nextToken` for subsequent pages. Existing `page` inputs support zero-based paging by following those tokens; `size` maps to the provider's page size. Dashboard users and infotype categories do not support pagination. Unsupported legacy fields return an actionable validation error instead of being silently ignored.

The API contract follows the vendor-authored [Borneo client SDK](https://www.npmjs.com/package/@borneodata/borneo-client) version 3.19.4. The vendor marks that SDK deprecated and directs current API documentation to `https://<your-stack>/docs/api`; verify deployment-specific support there. Tokens are supplied directly; reconnect when the deployment expires or revokes one.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
