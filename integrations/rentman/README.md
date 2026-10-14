# Rentman

Manage rental projects, equipment inventory, crew availability, contacts, appointments, and financial records for AV and event production. Create projects, subprojects, and project requests; manage contacts and contact persons; browse appointments and equipment serial numbers; record stock movements; and retrieve invoices, quotes, contracts, subrentals, and project costs. Collection tools support cursor pagination alongside their existing offset inputs. To continue with a cursor from `nextPageUrl`, repeat the original filters, resource IDs, sort, and fields. For appointments, this includes any `startAfter` and `startBefore` values. The cursor carries the original page limit.

The API uses a user-specific Bearer token from Rentman's Configuration > Account > Integrations. Calls inherit the token owner's permissions. See the [official API documentation](https://api.rentman.net/) for supported fields and access requirements.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
