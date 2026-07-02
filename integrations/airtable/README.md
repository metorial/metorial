# <img src="https://provider-logos.metorial-cdn.com/airtable.svg" height="20"> Airtable

Create, read, update, and delete records in Airtable bases and tables. Manage base schemas including creating tables and fields. Filter records using formulas, sort by fields, and scope queries to specific views. Upsert records to find, create, or update in a single call. Upload attachments to records, read and write record comments, list accessible bases, and receive real-time base change events through webhooks.

## Tools

### Create Records

Create one or more records in a table in the specified Airtable base. Provide field values for each record. Enable typecast to automatically convert string values to the appropriate field types.

### Delete Records

Delete one or more records from a table in the specified Airtable base. This action is **irreversible** and permanently removes the specified records.

### Get Base Schema

Retrieve the full schema of the specified Airtable base, including all tables, their fields (with types and options), and views. Useful for understanding the structure of a base before querying or modifying data.

### Get Record

Retrieve a single record by its ID from a table in the specified Airtable base. Returns all field values for the specified record.

### List Bases

List all Airtable bases the authenticated user has access to. Useful for discovering available bases and their IDs.

### List Records

List records from a table in the specified Airtable base. Supports filtering with Airtable formulas, sorting by fields, scoping to a specific view, selecting specific fields, and pagination.

### Manage Comment

List, create, update, or delete comments on a record in the specified Airtable base. Use this to read the conversation thread on a record or add new comments.

### Manage Field

Create a new field or update an existing field in a table within the specified Airtable base. Supports setting field type, name, description, and type-specific options.

### Manage Table

Create a new table or update an existing table in the specified Airtable base. When creating, provide the table name and initial fields. When updating, provide the table ID and new name or description.

### Upload Attachment

Upload a base64-encoded file directly into an Airtable attachment field on an existing record.

### Update Records

Update one or more existing records in a table in the specified Airtable base. By default performs a partial update (PATCH) that only modifies specified fields. Set **replaceAllFields** to true to perform a full replacement (PUT) which clears unspecified fields.

### Upsert Records

Find, create, or update records in a single operation. Records are matched using the specified merge fields. If a matching record is found it will be updated; otherwise a new record is created. This is useful for syncing data from external sources.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
