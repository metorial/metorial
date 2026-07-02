# <img src="https://provider-logos.metorial-cdn.com/postgresql.png" height="20"> Postgresql

Query, insert, update, and delete data in PostgreSQL relational databases. Explore schemas and tables, manage schemas, tables, indexes, views, materialized views, and database roles, and poll tables for row changes using timestamp or incrementing columns.

## Tools

### Delete Rows

Delete rows from a PostgreSQL table based on a WHERE condition. Supports returning the deleted rows and requires explicit confirmation for full-table deletes.

### Describe Table

Get detailed schema information for a specific table, including columns, data types, constraints, indexes, and foreign keys. Useful for understanding table structure before building queries or modifying schemas.

### Execute SQL Query

Execute an arbitrary SQL query against the PostgreSQL database. Supports all SQL operations including SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, and more. Returns column metadata and result rows for SELECT queries, or affected row counts for DML statements. Supports complex queries with joins, subqueries, CTEs, window functions, and aggregations.

### Insert Rows

Insert one or more rows into a PostgreSQL table. Provide the data as an array of objects where keys are column names and values are the data to insert. Supports inserting multiple rows in a single operation and can optionally return the inserted rows.

### List Schemas

List all schemas in the PostgreSQL database with their table counts and sizes. Useful for exploring the database structure and understanding the organization of tables across schemas.

### Manage Schemas

Create, rename, or drop PostgreSQL schemas. Drop operations require explicit confirmation and can optionally cascade to contained objects.

### List Tables

List all tables in the PostgreSQL database, optionally filtered by schema. Returns table names, schemas, row estimates, and size information. Also supports listing views and materialized views.

### Manage Indexes

Create or drop indexes on PostgreSQL tables. Supports B-tree, Hash, GIN, GiST, and other index types. Can create unique indexes, partial indexes with WHERE conditions, and multi-column indexes.

### Manage Roles

Manage PostgreSQL roles and their privileges. Supports creating and dropping roles, as well as granting and revoking privileges on databases, schemas, tables, and other objects.

### Manage Table

Create, alter, or drop a PostgreSQL table. Supports creating tables with columns, constraints, and foreign keys. For altering tables, supports adding columns, dropping columns, renaming columns, altering column types, and renaming the table.

### Manage Views

Create and drop PostgreSQL views or materialized views, and refresh materialized views. View definitions are restricted to a single read query for safer structured management.

### Update Rows

Update rows in a PostgreSQL table based on a WHERE condition. Specify the columns to update and their new values. Supports returning updated rows and allows complex WHERE conditions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
