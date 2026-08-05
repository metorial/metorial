# Odoo

Connect to Odoo business data and workflows across CRM, Sales, Accounting, Purchase, Inventory, Projects, and other installed modules. The integration automatically uses Odoo 19+ JSON-2 for current API-key connections and keeps legacy JSON-RPC support for older servers and existing connections.

Discover models and field definitions, verify the connected user, search or count records with Odoo domains, read records by ID, and create, update, or permanently delete records. Download binary Odoo attachments as files, or use focused tools to confirm sales orders, post invoices and vendor bills, confirm purchase orders, mark CRM opportunities won, and complete activities. A guarded public-method tool remains available for workflows that have no dedicated tool.

Two triggers cover Odoo-originated changes:

- Odoo Webhook Notification receives JSON payloads from an Odoo **Send Webhook Notification** automation action.
- Record Changes polls contact records (`res.partner`) and emits creation or update events after an initial no-replay baseline.

Available records, fields, workflow actions, and trigger behavior follow the installed Odoo modules, the connected user's access rights, and the database's automation configuration. External API access may require an Odoo Custom plan.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
