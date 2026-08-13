# <img src="logo.svg" height="20"> Zoho Inventory

Manage inventory, orders, and invoicing across multiple warehouses. Create and track items, item groups, and composite items with SKU, pricing, and reorder levels. Create and manage sales orders, purchase orders, invoices, bills, and credit notes with full lifecycle support. Record inventory adjustments, transfer stock between warehouses, and manage packaging and shipments with tracking. Handle customer payments, sales returns, vendor credits, and refunds. Manage contacts, price lists, taxes, currencies, and users. Supports multi-warehouse operations, drop shipment workflows, and workflow-based webhook notifications.

## Authentication

Connect with your own regular regional or Multi-DC OAuth application. Regional applications require their registered region; Multi-DC applications may optionally constrain the expected account region. The authorization callback determines and persists the regional Accounts server used for token exchange and refresh, while Inventory requests and organization discovery use the validated API domain returned with the token. Existing regional connections must reconnect with the unified OAuth method after upgrading.

Previous Japan and Saudi Arabia connections were authorized against the US Accounts server because of an incorrect local mapping. Treat those connections as mis-homed and reconnect them with the correct region.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
