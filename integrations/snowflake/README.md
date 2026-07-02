# <img src="https://provider-logos.metorial-cdn.com/snowflake.svg" height="20"> Snowflake

Execute SQL statements and manage cloud data warehouse resources on Snowflake. Run queries synchronously or asynchronously, manage databases, schemas, tables, warehouses, users, roles, grants, tasks, stages, streams, and pipes. Ingest data via Snowpipe batch loading or Snowpipe Streaming for low-latency continuous ingestion. Access Cortex AI services for search, inference, and embeddings. Configure outbound notifications to Slack, Microsoft Teams, PagerDuty, email, or cloud queues (SNS, PubSub, Event Grid). Supports multi-statement transactions, resource creation and alteration without SQL, and dynamic tables.

## Tools

### Cancel Statement

Cancel a running or queued SQL statement. Provide the statement handle from a previous execution to stop it.

### Check Statement Status

Check the execution status of a previously submitted SQL statement and retrieve its results. Use this after submitting an asynchronous query to poll for completion and fetch result data, or to retrieve additional result partitions for large result sets.

### Execute SQL

Execute one or more SQL statements against Snowflake and return the results. Supports SELECT queries, DDL (CREATE, ALTER, DROP), and DML (INSERT, UPDATE, DELETE) statements. Multiple statements can be separated by semicolons. Results include column metadata and row data for queries, or affected row counts for DML.

### Manage Database

Create, retrieve, list, or delete Snowflake databases. Use the **action** field to specify the operation. When listing, optionally filter by pattern. When creating, provide the database name and optional settings like comment, data retention, etc.

### Manage Grant

Grant or revoke privileges on Snowflake objects. Use this to control access by assigning specific privileges (e.g. SELECT, INSERT, USAGE) on resources (databases, schemas, tables, warehouses) to roles.

### Manage Role

Create, retrieve, list, or delete Snowflake roles. Roles control access privileges to objects and operations. Use roles in conjunction with grants to manage fine-grained permissions.

### Manage Schema

Create, retrieve, list, or delete schemas within a Snowflake database. Schemas organize tables and other objects within a database. Provide the parent database name and the desired action.

### Manage Table

Create, retrieve, list, or delete tables within a Snowflake database and schema. When creating, define columns with their data types. For complex table alterations, use the Execute SQL tool with ALTER TABLE statements.

### Manage Task

Create, retrieve, list, execute, or delete Snowflake tasks. Tasks schedule SQL statements or stored procedure calls on a recurring basis. Use the **execute** action to manually trigger a task run.

### Manage User

Create, retrieve, list, or delete Snowflake users. Users represent individual accounts that can connect to and interact with Snowflake. When creating a user, optionally assign a default role, warehouse, and namespace.

### Manage Warehouse

Create, retrieve, list, delete, resume, suspend, or abort queries on Snowflake virtual warehouses. Warehouses provide the compute resources for executing queries. Use the **action** field to control the operation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
