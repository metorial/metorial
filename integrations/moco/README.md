# <img src="logo.jpeg" height="20"> Moco

Manage MOCO projects, project tasks, time entries, companies, contacts, deals, invoices, offers, purchases, project expenses, resource planning, comments, and presences. Retrieve project reports and staff information, identify the authenticated user, and list or record invoice payments.

Connect with your API key and account subdomain. Collection tools accept optional `page` and `perPage` inputs for paging through results. Use `get_profile` to identify the authenticated user, and `list_invoice_payments` or `create_invoice_payment` to manage payment records. Invoice and offer creation accepts an explicit `vatCodeId` or a matching tax percentage; line items default to the `item` type. `delete_invoice` accepts the deletion reason required for non-draft invoices.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
