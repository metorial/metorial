# <img src="https://provider-logos.metorial-cdn.com/redis.png" height="20"> Redis

Manage Redis Cloud database subscriptions and infrastructure programmatically. Create, update, delete, and list subscriptions across AWS, Google Cloud, and Azure. Manage databases with configurable persistence, replication, modules, and sizing. Back up databases to cloud storage and import data from S3, FTP, or other Redis instances. Control access with ACL rules and roles, manage users and cloud provider accounts, track asynchronous tasks, audit API activity via system logs, and estimate subscription costs with dry-run operations.

## Tools

### Backup Database

Trigger a backup of a Redis Cloud database. The backup is stored in RDB format at the configured backup path or an ad-hoc path. Returns a task ID to track backup progress.

### Create Database

Create a new Redis Cloud database within an existing subscription. Configure dataset size, persistence, replication, modules, and throughput settings. Returns a task ID to track creation.

### Create Subscription

Create a new Redis Cloud subscription. Supports both **Pro** and **Essentials** types. For Pro subscriptions, specify cloud providers, regions, networking CIDR, and initial databases. For Essentials subscriptions, specify a plan ID. Returns a task ID to track the asynchronous creation process.

### Delete Database

Delete a Redis Cloud database from a subscription. This is a destructive, irreversible action. Returns a task ID to track the deletion process.

### Delete Subscription

Delete a Redis Cloud subscription. Supports both **Pro** and **Essentials** subscription types. This is a destructive, irreversible action. Returns a task ID to track the deletion.

### Get Database

Retrieve detailed information about a specific Redis Cloud database, including its configuration, endpoints, memory usage, and module settings. Supports both **Pro** and **Essentials** databases.

### Get System Logs

Retrieve system audit logs for the Redis Cloud account. Logs track API requests, console actions, and changes to subscriptions, databases, users, and other entities.

### Get Subscription

Retrieve detailed information about a specific Redis Cloud subscription by ID. Supports both **Pro** and **Essentials** subscription types.

### Get Task

Track the status of an asynchronous operation using its task ID. All create, update, and delete operations return a task ID. Use this to check if an operation has completed, is still processing, or has failed.

### Import Database

Import data into an existing Redis Cloud database from external sources. Supports AWS S3, Google Cloud Storage, Azure Blob Storage, FTP, HTTP, and Redis server sources. **Warning:** Importing data overwrites any existing data in the target database.

### List Databases

List all databases within a Redis Cloud subscription. Returns database IDs, names, status, endpoints, and memory usage. Supports both **Pro** and **Essentials** subscriptions.

### List Essentials Plans

List available Redis Cloud Essentials plans. Use plan IDs when creating Essentials subscriptions. Plans define the cloud provider, region, pricing, and resource limits.

### List Payment Methods

List all payment methods associated with the Redis Cloud account. Returns payment method IDs needed for creating or updating subscriptions.

### List Subscriptions

List all Redis Cloud subscriptions in the account. Returns both **Pro** and **Essentials** subscriptions with their status, plan type, cloud provider, and region.

### List ACL Roles

List all ACL roles in the account. Roles group ACL rules and associate them with databases for role-based access control.

### List ACL Rules

List all Redis ACL rules in the account. ACL rules define permitted commands, key patterns, and pub/sub channels for fine-grained database access control.

### List ACL Users

List all ACL users in the account. ACL users are database-level users assigned to ACL roles for fine-grained data access control.

### List Cloud Accounts

List all registered cloud provider accounts (AWS, GCP, Azure) used for hosting Redis Cloud subscriptions.

### List Users

List all account-level users in the Redis Cloud account. Shows user names, emails, roles, and status.

### Update Database

Update an existing Redis Cloud database. Modify name, memory, persistence, replication, eviction policy, modules, and more. Returns a task ID to track the update.

### Update Subscription

Update an existing Redis Cloud subscription. Supports renaming, changing payment methods, and updating plan (Essentials only). Returns a task ID to track the asynchronous update.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
