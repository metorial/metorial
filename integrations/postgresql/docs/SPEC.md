# Slates Specification for PostgreSQL

## Overview

PostgreSQL is an open-source relational database management system used for storing, querying, and managing structured data. It supports SQL for data manipulation and definition, advanced data types, extensibility through plugins, and features like transactions, views, stored procedures, and triggers.

## Authentication

PostgreSQL uses a direct database connection model rather than API keys or OAuth. The primary method for remote client authentication is **password-based authentication** via a connection string.

### Connection String Authentication

To connect, the following credentials are required:

- **Host**: The server hostname or IP address
- **Port**: The port PostgreSQL listens on (default: `5432`)
- **Database**: The name of the target database
- **Username**: The database user
- **Password**: The user's password

The general format for a PostgreSQL connection string (URI) is: `postgresql://[user[:password]@][host][:port][/dbname][?options]`

Example: `postgresql://user:password@localhost:5432/mydatabase`

### SSL/TLS Encryption

For a connection to be known SSL-secured, SSL usage must be configured on both the client and the server before the connection is made. The `sslmode` parameter controls SSL behavior:

- `disable` — No SSL
- `require` — Encrypt the connection, but don't verify the server certificate
- `verify-ca` — Verify that the server is trustworthy by checking the certificate chain up to the root certificate stored on the client
- `verify-full` — Also verify that the server host name matches the name stored in the server certificate

Example with SSL: `postgresql://user:password@localhost:5432/mydatabase?sslmode=require`

When using SSL with client certificates, additional parameters include `sslcert`, `sslkey`, and `sslrootcert` to specify file paths for the client certificate, private key, and root CA certificate respectively.

### Password Hashing Methods

The server may be configured to use different password verification schemes:

- **SCRAM-SHA-256**: The most secure password-based authentication method in PostgreSQL. It uses the Salted Challenge Response Authentication Mechanism (SCRAM) with the SHA-256 hashing function.
- **MD5**: Password is hashed with MD5 before transmission. Considered legacy.
- **Plain password**: Sent in clear text; only safe over SSL.

The hashing method is configured server-side and is typically transparent to the connecting client.

## Features

### Data Querying and Manipulation

Execute SQL queries to read, insert, update, and delete data. Supports complex queries with joins, subqueries, aggregations, window functions, common table expressions (CTEs), and full-text search.

### Schema Management

Create and alter databases, schemas, tables, columns, indexes, constraints, and sequences. Supports a rich type system including JSON/JSONB, arrays, enums, geometric types, network address types, and user-defined types.

### Stored Procedures and Functions

Define reusable server-side logic using PL/pgSQL or other procedural languages (PL/Python, PL/Perl, etc.). Functions can return scalar values, rows, or sets of rows and can be used within queries.

### Transactions

Full ACID-compliant transaction support with configurable isolation levels (Read Committed, Repeatable Read, Serializable). Supports savepoints for partial rollbacks within a transaction.

### Views and Materialized Views

Create virtual tables (views) based on queries for simplified data access. Materialized views store query results physically and can be refreshed on demand for performance optimization.

### Triggers

Define automatic actions that execute before, after, or instead of INSERT, UPDATE, or DELETE operations on specific tables. Triggers are essentially callbacks at the database level that can execute a defined function before, after, or instead of identified operations on the table(s) you specify.

### User and Permission Management

Create and manage database roles (users and groups). Grant or revoke privileges at the database, schema, table, column, or function level. Supports row-level security policies for fine-grained access control.

### Extensions

PostgreSQL supports extensions that add functionality, such as PostGIS (geospatial), pg_trgm (trigram matching), hstore (key-value pairs), and many others. Extensions are installed per-database.

### Import and Export

Copy data in bulk using the `COPY` command, which supports CSV and binary formats for efficient data loading and extraction.

## Events

PostgreSQL provides two built-in mechanisms for event-driven data capture:

### LISTEN/NOTIFY

NOTIFY provides a simple interprocess communication mechanism for a collection of processes accessing the same PostgreSQL database. A payload string can be sent along with the notification, and higher-level mechanisms for passing structured data can be built by using tables in the database to pass additional data from notifier to listener(s).

- Clients subscribe to named channels using the `LISTEN` command and receive notifications sent via `NOTIFY` or the `pg_notify()` function.
- The payload from the message can be any text, up to 8kB in length.
- Commonly combined with triggers to automatically emit notifications on INSERT, UPDATE, or DELETE events on specific tables.
- If a NOTIFY is executed inside a transaction, the notify events are not delivered until and unless the transaction is committed.
- It is crucial that an application using the PostgreSQL notification capabilities are capable of missing events. Notifications are only sent to connected client connections. If the listener disconnects, notifications during that time are lost.

### Logical Replication (Change Data Capture)

Logical replication is a method of replicating data objects and their changes, based upon their replication identity (usually a primary key). Logical replication uses a publish and subscribe model with one or more subscribers subscribing to one or more publications on a publisher node.

- Captures all row-level changes (INSERT, UPDATE, DELETE) from specified tables via the Write-Ahead Log (WAL).
- Since version 9.4, PostgreSQL offers logical replication, and Postgres versions 10 and later feature the default 'pgoutput' plugin. Older versions require manually installing plugins like `wal2json` or `decoderbufs`.
- Requires `wal_level` to be set to `logical` on the server and the connecting user to have replication privileges.
- Uses replication slots to track what data has been consumed, ensuring no changes are missed even if the consumer disconnects temporarily.
- Table creation and modification steps are not captured by these events. Only DML operations are streamed.
- Many managed PostgreSQL services, including AWS RDS, Google Cloud SQL, and Azure Database, support Logical Replication.
