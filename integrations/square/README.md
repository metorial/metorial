# <img src="https://provider-logos.metorial-cdn.com/squareup.svg" height="20"> Square

Process payments, manage orders, and handle invoices for online, in-app, and in-person commerce. Create and manage customer profiles, catalog items, inventory counts, and locations. Issue refunds, manage disputes, and track payouts. Create bookings and appointments, manage team members and timecards, handle gift cards and loyalty programs, and manage subscriptions. Save cards on file, generate checkout links, connect and control Square Terminal devices, and manage vendor/supplier information. Extend Square objects with custom attributes. Receive webhook notifications for payments, orders, customers, inventory, invoices, bookings, disputes, team changes, and more.

## Tools

### Adjust Inventory

Make inventory changes such as adjustments, physical counts, or transfers. Supports batch operations for multiple catalog items and locations simultaneously.

### Create Customer

Create a new customer profile. Provide at least one of: given name, family name, company name, email address, or phone number.

### Create Invoice

Create a new draft invoice for an existing order. The invoice must be published separately before it can be sent to the customer.

### Create Order

Create a new order at a Square location. Supports line items, taxes, discounts, fulfillments, and customer association. Orders start in OPEN state.

### Create Payment

Create a new payment using a payment source (nonce, card on file, etc.). Supports setting amount, tip, customer, location, and delayed capture.

### Delete Catalog Object

Delete a catalog object by its ID. Deleting an item also deletes its variations. Deleted objects can still be referenced by existing orders.

### Delete Customer

Permanently delete a customer profile from the Square account. This action cannot be undone.

### Get Catalog Object

Retrieve a specific catalog object by its ID. Returns full object data including related objects (e.g., item variations, modifier lists) when requested.

### Get Customer

Retrieve full details of a specific customer profile by ID. Returns contact information, address, notes, preferences, and group memberships.

### Get Inventory Counts

Retrieve inventory counts for one or more catalog item variations. Can look up counts for a single item variation or batch retrieve counts for multiple items across locations.

### Get Invoice

Retrieve full details of a specific invoice by its ID, including payment requests, recipients, and accepted payment methods.

### Get Order

Retrieve full details of a specific order by its ID. Returns line items, taxes, discounts, fulfillments, tenders, and all order metadata.

### Get Payment

Retrieve full details of a specific payment by its ID. Returns comprehensive payment information including amount, status, card details, and receipt URL.

### List Customers

Retrieve a list of customer profiles. Supports pagination and sorting by creation date or default order.

### List Invoices

Retrieve a list of invoices for a specific location. Returns invoice summaries including status, amounts, and recipients.

### List Locations

Retrieve all business locations associated with the Square account. Returns location names, addresses, statuses, and capabilities. Useful for obtaining location IDs needed by other tools.

### List Payments

Retrieve a list of payments taken by the Square account. Supports filtering by time range, location, and pagination. Returns payment details including amounts, status, and source type.

### Manage Invoice

Publish, cancel, or delete an invoice. Publishing sends the invoice to the customer. Canceling stops a published invoice. Deleting permanently removes a draft invoice.

### Manage Payment

Complete or cancel an existing payment. Use "complete" to capture a previously authorized (delayed) payment, or "cancel" to void it.

### Refund Payment

Issue a full or partial refund for a Square payment. Specify the payment ID and the amount to refund. Optionally provide a reason for the refund.

### Search Catalog

Search the Square catalog for items, variations, categories, taxes, discounts, and other catalog objects. Supports text search, category filtering, and object type filtering.

### Search Orders

Search for orders across one or more locations. Supports filtering by date range, fulfillment state, customer, and other criteria. Use this to find and list orders.

### Update Customer

Update an existing customer profile. Only provided fields will be updated; omitted fields remain unchanged.

### Upsert Catalog Object

Create or update a catalog object (item, variation, category, tax, discount, modifier list, etc.). Use a temporary ID starting with '#' for new objects. For updates, provide the existing object ID and current version.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
