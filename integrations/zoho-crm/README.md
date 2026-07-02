# <img src="https://provider-logos.metorial-cdn.com/zoho-crm.svg" height="20"> Zoho Crm

Manage Zoho CRM records across standard and custom modules. Create, read, update, delete, search, and query records with the current Zoho CRM V8 APIs; discover module fields, layouts, custom views, and related lists; manage notes, tags, and record attachments; send CRM emails; inspect users and organization metadata; and subscribe to record change notifications.

## Tools

### Create Record

Create one or more records in any Zoho CRM module. Provide the module name and an array of record objects with field values. Optionally control which workflow triggers fire upon creation.

### Delete Records

Delete one or more records from any Zoho CRM module by their IDs. Permanently removes the specified records. This action cannot be undone.

### Execute COQL Query

Execute a COQL (CRM Object Query Language) query to retrieve data using SQL-like syntax. COQL supports SELECT queries with WHERE, ORDER BY, LIMIT, and OFFSET clauses. Useful for complex, cross-field queries and precise data extraction.

### Get Module Metadata

Retrieve metadata about CRM modules including available fields, layouts, custom views, related lists, and module configuration. Without a module name, lists all available modules. With a module name, returns selected metadata for that module. Useful for discovering field API names, data types, picklist values, custom view IDs, related list API names, and module structure.

### Get Organization

Retrieve your Zoho CRM organization details including company name, time zone, currency, license info, and other settings.

### Get Record

Retrieve a single record by its ID from any Zoho CRM module. Returns the full record with all fields, or optionally only specific fields.

### Get Records

Retrieve records from any Zoho CRM module (Leads, Contacts, Accounts, Deals, Tasks, Events, etc.). Supports pagination, field selection, sorting, and fetching specific records by ID. Use **module** to specify which CRM module to query, and optionally filter or sort results.

### Get Related Records

Retrieve records related to a specific CRM record through lookup or multi-select lookup fields. For example, get all Contacts related to an Account, or all Tasks associated with a Deal.

### Get Users

Retrieve CRM users from your Zoho organization. Filter by user type (AllUsers, ActiveUsers, DeactiveUsers, ConfirmedUsers, etc.) or get a specific user by ID.

### Manage Notes

List, create, update, or delete notes associated with a CRM record. Set **action** to "list" to get notes, "create" to add a new note, "update" to edit a note, or "delete" to remove a note.

### Manage Attachments

List, upload, download, or delete attachments associated with a CRM record. File downloads are returned as Slate attachments, with structured output limited to metadata such as attachment ID, MIME type, size, and attachment count.

### Manage Tags

List, add, or remove tags on CRM records. Set **action** to "list" to view available tags for a module, "add" to tag records, or "remove" to untag records.

### Search Records

Search for records in any Zoho CRM module using criteria, email, phone, or keyword. Supports the Zoho CRM search criteria syntax for advanced filtering. Use **criteria** for field-based filters, **email**/**phone** for contact lookups, or **word** for full-text search.

### Send Email

Send an email from Zoho CRM associated with a specific record. The email is logged against the record for tracking purposes.

### Update Record

Update one or more records in any Zoho CRM module. For a single record, provide **recordId** and **recordData**. For bulk updates, provide **records** with each item containing an "id" field. Optionally control which workflow triggers fire upon update.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
