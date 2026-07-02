# Slates Specification for MySQL

## Overview

MySQL is an open-source relational database management system that uses SQL for data definition, manipulation, and querying. It supports transactional storage engines (primarily InnoDB), replication, and a wide range of client connectors. MySQL is widely used for web applications, data warehousing, and general-purpose data storage.

## Authentication

MySQL uses a direct database connection model (not a REST API). Authentication is performed during the connection handshake using the MySQL client/server protocol.

### Connection Credentials

To connect to a MySQL instance, the following parameters are required:

- **Host**: The server address (hostname or IP).
- **Port**: The TCP port (default: `3306`).
- **Username**: The MySQL user account.
- **Password**: The password for the user account.
- **Database** (optional): The default database/schema to use after connecting.

### Authentication Plugins

In MySQL 8.0, `caching_sha2_password` is the default authentication plugin rather than `mysql_native_password`, which was the default in MySQL 5.7. The `mysql_native_password` plugin is disabled by default as of MySQL Server 8.4.0 and removed as of MySQL Server 9.0.0.

The most commonly relevant authentication plugins for integration purposes are:

- **`caching_sha2_password`** (default in MySQL 8.0+): Requires a secure connection (made using TLS credentials, a Unix socket file, or shared memory) or an unencrypted connection that supports password exchange using an RSA key pair.
- **`mysql_native_password`**: Legacy password-based authentication (deprecated/removed in newer versions).

### SSL/TLS Encryption

Connections can be encrypted using TLS. MySQL 8.4 supports the TLSv1.2 and TLSv1.3 protocols for connections. The following optional SSL parameters can be configured:

- **SSL Mode**: Controls whether SSL is required (e.g., `DISABLED`, `PREFERRED`, `REQUIRED`, `VERIFY_CA`, `VERIFY_IDENTITY`).
- **SSL CA Certificate**: Path or content of the Certificate Authority certificate for verifying the server.
- **SSL Client Certificate**: Path or content of the client certificate for mutual TLS authentication.
- **SSL Client Key**: Path or content of the client's private key for mutual TLS.

### SSH Tunnel

Many integration platforms support connecting to MySQL through an SSH tunnel for instances that are not publicly accessible. This requires SSH host, port, username, and an SSH key or password.

## Features

### SQL Query Execution

Execute arbitrary SQL statements against the database, including `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and DDL statements (`CREATE`, `ALTER`, `DROP`). Supports parameterized queries to prevent SQL injection.

### Schema and Metadata Inspection

Retrieve information about databases, tables, columns, indexes, constraints, and other schema objects via the `INFORMATION_SCHEMA` system database. Useful for dynamic discovery of database structure.

### Database and Table Management

Create, alter, and drop databases and tables. Manage indexes, foreign keys, views, and other schema objects. Supports multiple storage engines (InnoDB, MyISAM, etc.) with different characteristics.

### Stored Procedures and Functions

Create and execute stored procedures and user-defined functions. Useful for encapsulating complex business logic on the server side.

### User and Permission Management

Create and manage user accounts, assign privileges at the global, database, table, or column level. Supports role-based access control in MySQL 8.0+.

### Transactions

Execute multiple statements within a transaction with full ACID compliance (when using InnoDB). Supports `BEGIN`, `COMMIT`, `ROLLBACK`, and savepoints.

### Data Import and Export

Bulk load data from files using `LOAD DATA INFILE` or export query results. Supports CSV and other delimited formats.

- The `LOAD DATA LOCAL INFILE` feature must be explicitly enabled on both client and server for security reasons.

### Replication and Binary Log Access

MySQL offers the Binlog for efficiently and safely replicating data between different database instances on possibly different physical machines. The binlog can be accessed programmatically to implement change data capture (CDC) workflows.

- The user is granted `REPLICATION SLAVE`, `REPLICATION CLIENT` privileges.
- Binlog format should be set to `ROW` for row-level change tracking.

## Events

MySQL does not natively support webhooks or HTTP-based event subscriptions. However, it provides a built-in mechanism for streaming data change events via the **Binary Log (binlog)** replication protocol, which serves as a purpose-built change data capture mechanism.

### Binary Log (Binlog) Replication Stream

The Binlog is a binary file on disk which holds all events that change the content or structure of the MySQL database, e.g., INSERTs, UPDATEs, DELETEs, schema changes, etc. A client can connect to the MySQL server as a replication replica and consume binlog events in real-time.

- **Data Change Events (DML)**: Binlog-based CDC can detect all change event types: INSERTs, UPDATEs, DELETEs, and even schema changes. When using row-based binlog format, each event includes the before and/or after state of the affected row.
- **Schema Change Events (DDL)**: Changes to table structure such as `CREATE TABLE`, `ALTER TABLE`, and `DROP TABLE` are recorded as events.
- **Configuration**: Requires `log_bin` to be enabled, `binlog_format` set to `ROW`, and an appropriate `binlog_row_image` setting (typically `FULL`). There are `expire_logs_days` and `binlog_expire_logs_seconds` settings that control how long binlog files live. By default MySQL has expiration time set and deletes expired binlog files.
- **Filtering**: Events can be filtered by database and table on the consumer side.
- **Tools**: Commonly consumed using CDC frameworks such as Debezium or similar binlog-reading libraries.
