# <img src="https://provider-logos.metorial-cdn.com/mysql.png" height="20"> Mysql

Execute SQL queries to read, insert, update, and delete data in MySQL databases. Create and manage databases, tables, indexes, views, and other schema objects. Inspect schema metadata including columns, constraints, and indexes via INFORMATION_SCHEMA. Run stored procedures and user-defined functions. Manage user accounts and privileges. Execute transactions with ACID compliance. Bulk import and export data in CSV and delimited formats. Stream real-time data change events (inserts, updates, deletes, schema changes) via binary log (binlog) replication for change data capture (CDC).

## Tools

### Delete Rows

Delete rows from a MySQL table that match a WHERE condition. Requires a WHERE clause to target specific rows unless confirmDeleteAll is explicitly set.

### Describe Table

Get detailed schema information for a specific MySQL table, including columns, data types, constraints, indexes, and foreign keys. Useful for understanding table structure before building queries or modifying schemas.

### Execute SQL Query

Execute an arbitrary SQL query against the MySQL database. Supports all SQL operations including SELECT, INSERT, UPDATE, DELETE, and DDL statements (CREATE, ALTER, DROP). Returns column metadata and result rows for SELECT queries, or affected row counts for DML/DDL statements. Supports complex queries with joins, subqueries, CTEs, window functions, and aggregations.

### Insert Rows

Insert one or more rows into a MySQL table. Provide the data as an array of objects where keys are column names and values are the data to insert. Supports inserting multiple rows in a single operation and handling duplicate key conflicts.

### List Databases

List all databases on the MySQL server. Returns database names, default character sets, and collations. Optionally includes system databases (information_schema, performance_schema, mysql, sys).

### List Tables

List all tables in a MySQL database. Returns table names, types, engines, row estimates, and size information. Also supports listing views.

### Manage Indexes

Create or drop indexes on MySQL tables. Supports standard, unique, fulltext, and spatial indexes. Useful for optimizing query performance by adding appropriate indexes.

### Manage Table

Create, alter, or drop a MySQL table. Supports creating tables with columns, constraints, foreign keys, and storage engine selection. For altering tables, supports adding columns, dropping columns, renaming columns, modifying column types, and renaming the table.

### Manage Users

Create, drop, or manage MySQL user accounts and their privileges. Supports granting and revoking permissions at the global, database, table, or column level. Can also list existing users and their grants.

### Update Rows

Update rows in a MySQL table that match a WHERE condition. Provide the columns to update as key-value pairs. Requires a WHERE clause to target specific rows unless confirmUpdateAll is explicitly set.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
