# Item

Manage people, companies, and custom objects in item. List and retrieve flat object records across contacts, companies, and custom object types with pagination, search, sorting, and field-based filters. Create, update, soft-delete, and batch upsert records for sync and CRM workflows. Inspect the full workspace schema to discover object types, fields, select options, and relationship metadata. List organization users for ownership mapping, list shared views, and execute saved views to pull pre-filtered structured data. Trigger live item skills through webhook endpoints with arbitrary JSON payloads and optional HMAC signatures.

## Tools

### List Objects

List records for a specific item object type such as contacts, companies, or a custom object. Supports pagination, search, sorting, and field-based filters.

### Get Object

Fetch a single item record by ID, or by email for contacts. Useful for retrieving the full flattened record with all available fields.

### Create Object

Create a new contact, company, or custom object record in item. Contacts and companies may deduplicate automatically based on item matching rules.

### Update Object

Update one or more fields on an existing item record. Supports both system fields and custom fields, leaving unspecified fields unchanged.

### Delete Object

Soft-delete an item record by ID. Relationships involving the record are also soft-deleted.

### Batch Upsert Objects

Create or update up to 100 item records in one request. Each record is processed independently, so partial success is possible.

### Get Schema

Retrieve the item schema for all available object types, including field definitions and select options. Useful for discovering custom objects and valid field names before creating or updating records.

### List Users

List organization users in item, including their IDs and access levels. Useful for mapping owner fields or assigning records.

### List Views

List shared views configured for an item object type. Views capture saved filters, sorting, and visible columns from the item UI.

### Execute View

Run a shared item view and return its filtered, sorted records. This is the preferred way to pull structured item data on a schedule.

### Trigger Skill Webhook

Send a JSON payload to an item skill webhook to start a skill run. Optionally signs the payload with an HMAC-SHA256 signature using the API key as the shared secret.

## License

This integration is licensed under the Apache 2.0 License.

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
