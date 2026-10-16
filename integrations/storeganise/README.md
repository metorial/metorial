# <img src="logo.png" height="20"> Storeganise

Manage storage operations with site and unit discovery, tenant accounts, invoices, unit rentals, move-in and move-out jobs, valet orders, leads, and account settings.

Connect with an API key created under Main Settings > Developer and your business code, such as `spaceup` for `https://spaceup.storeganise.com`. Choose the minimum API-key role needed for your workflows.

Use `list_sites`, `list_units`, `list_users`, and `list_unit_rentals` to discover IDs before working with individual records. `get_unit_rental` can include the related unit, owner, and custom fields. User and invoice list tools support fetching up to 50 IDs in one request.

See [Developer settings](https://help.storeganise.com/article/33-developer-settings), [API best practices](https://help.storeganise.com/article/297-api-best-practices), and the [capability specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
