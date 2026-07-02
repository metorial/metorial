# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Dynamodb

Create, manage, and delete DynamoDB tables with configurable capacity modes and key schemas. Perform CRUD operations on items using primary keys, including conditional writes and attribute-level updates. Query items by partition and sort key conditions, or scan entire tables with filter and projection expressions. Support PartiQL (SQL-compatible) syntax for data operations. Manage secondary indexes (GSI and LSI) for alternative query patterns. Execute multi-item transactions with all-or-nothing guarantees across tables. Configure global tables for multi-region active-active replication. Create and restore on-demand backups, enable point-in-time recovery, and set TTL for automatic item expiration. Import and export data between S3 and DynamoDB. Monitor table changes via DynamoDB Streams for near-real-time change data capture with configurable stream view types.

## Tools

### Batch Get Items

Retrieve multiple items from one or more DynamoDB tables in a single request using their primary keys. Supports up to 100 items per batch and optional projection expressions.

### Batch Write Items

Put or delete multiple items across one or more DynamoDB tables in a single request. Supports up to 25 put/delete operations per batch. Does not support update operations — use individual UpdateItem for that.

### Create Table

Create a new DynamoDB table with a specified key schema, attribute definitions, and optional secondary indexes. Supports configuring billing mode (on-demand or provisioned), table class, DynamoDB Streams, and tags.

### Delete Item

Delete a single item from a DynamoDB table by its primary key. Supports conditional deletes and optionally returns the deleted item.

### Delete Table

Permanently delete a DynamoDB table and all of its items. This action cannot be undone.

### Describe Table

Retrieve detailed information about a DynamoDB table including its key schema, provisioned throughput, indexes, stream configuration, and current status.

### Execute PartiQL

Execute a PartiQL statement against DynamoDB. PartiQL is a SQL-compatible query language that supports SELECT, INSERT, UPDATE, and DELETE operations. Useful for users familiar with SQL syntax as an alternative to DynamoDB's native expression-based API.

### Get Item

Retrieve a single item from a DynamoDB table by its primary key. Returns the full item or specific attributes via projection expression. Supports strongly consistent reads.

### List Tables

List all DynamoDB table names in the configured region. Supports pagination for accounts with many tables.

### Manage Backups

Create, list, or delete on-demand backups for DynamoDB tables. Also supports viewing and toggling point-in-time recovery (PITR) settings.

### Manage TTL

View or configure Time to Live (TTL) settings on a DynamoDB table. When enabled, items with an expired TTL attribute are automatically deleted. Useful for session data, temporary records, or implementing data retention policies.

### Put Item

Create or replace an item in a DynamoDB table. The entire item is replaced if an item with the same primary key exists. Use DynamoDB JSON format for attribute values (e.g., \

### Query Items

Query items from a DynamoDB table or secondary index using a key condition expression on the partition key (and optionally the sort key). Efficient for retrieving items that share the same partition key. Supports filtering, projection, pagination, and sort order control.

### Scan Items

Scan an entire DynamoDB table or secondary index, returning all items or those matching a filter expression. More flexible but less efficient than Query — reads every item in the table. Use Query when possible for better performance.

### Transact Write Items

Execute a transactional write with up to 100 actions across one or more DynamoDB tables. All actions succeed or all fail together (ACID). Supports Put, Update, Delete, and ConditionCheck operations within a single transaction.

### Update Item

Update specific attributes of an existing item in a DynamoDB table using update expressions. Unlike PutItem, this modifies only the specified attributes without replacing the entire item. Supports SET, REMOVE, ADD, and DELETE operations within update expressions, and conditional updates.

### Update Table

Update a DynamoDB table's settings including billing mode, provisioned throughput, stream configuration, and table class. Can also be used to manage global secondary indexes (create, update, or delete).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
