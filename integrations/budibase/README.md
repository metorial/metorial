# <img src="https://provider-logos.metorial-cdn.com/budibase.png" height="20"> Budibase

Manage low-code internal business applications, tables, rows, users, and queries. Create, retrieve, update, delete, and search applications, with the ability to publish and unpublish them. Perform full CRUD operations on tables and rows (data records) within applications, including filtered and sorted search. Manage users and their role-based access. Execute pre-configured queries (SQL, REST, etc.) with dynamic parameters. Trigger automations via inbound webhooks by sending JSON payloads to auto-generated URLs.

## Tools

### Execute Query

Execute a pre-configured query in a Budibase application. Queries must first be created in the Budibase builder (e.g. REST API queries, SQL queries). Parameters can be passed dynamically at execution time.

### Manage Application

Create, retrieve, update, or delete a Budibase application. Use the **action** field to specify the operation. For "create", provide a name. For "get", "update", or "delete", provide the appId. For "update", include the fields to change.

### Manage Row

Create, retrieve, update, or delete a row in a Budibase table. Retrieving a single row returns it enriched with full related row data rather than just the primary display value.

### Manage Table

Create, retrieve, update, or delete a table within a Budibase application. Use "create" with a name and optional schema to define columns. Use "update" to modify the table name, primary display column, or schema.

### Manage User

Create, retrieve, update, or delete a user in the Budibase tenant. Supports setting email, name, password, roles, and builder/admin privileges.

### Publish Application

Publish or unpublish a Budibase application. Publishing makes the app available to end-users; unpublishing takes it offline and reverts it to development-only.

### Search Applications

Search for Budibase applications by name. Returns a list of applications matching the search criteria, including their IDs, URLs, and status.

### Search Queries

Search for pre-configured queries in a Budibase application by name. Returns query IDs, names, and parameter definitions that can be used with the "Execute Query" tool.

### Search Rows

Search for rows in a Budibase table with filtering, sorting, and pagination. Supports various filter operators including exact match, fuzzy search, range queries, and array operations.

### Search Tables

Search for tables within a Budibase application. Returns table names, IDs, and their column schemas. Requires the application ID to scope the search.

### Search Users

Search for users in the Budibase tenant. Returns user profiles including their email, roles, and privilege levels.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
