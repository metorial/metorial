# <img src="https://provider-logos.metorial-cdn.com/mongodb-atlas.png" height="20"> Mongodb Atlas

Manage MongoDB Atlas cloud database infrastructure programmatically. Provision, scale, pause, and delete database clusters across AWS, Azure, and GCP. Create and manage database users with role-based access control and multiple authentication methods (SCRAM, X.509, IAM, LDAP, OIDC). Configure network security including IP access lists, VPC peering, and private endpoints. Manage cloud backups, on-demand snapshots, scheduled backup policies, and point-in-time restores. Monitor cluster performance metrics, retrieve slow query logs, and get index recommendations from the Performance Advisor. Configure alerts for metric thresholds and operational events with notifications to webhooks, Slack, PagerDuty, Datadog, and other services. Create and manage Atlas Search indexes for full-text search. Set up database triggers that forward change events to AWS EventBridge. Configure online archiving rules to move data to cheaper storage. Manage organizations, projects, teams, invoices, federated authentication, and push-based log exports. Note: this API manages infrastructure only — it does not read or write application data stored in databases.

## Tools

### Get Cluster Metrics

Retrieve performance metrics and monitoring data for MongoDB Atlas cluster processes. Get CPU, memory, connections, opcounters, replication lag, disk utilization, and other metrics. Also lists cluster processes (mongod/mongos instances).

### Get Performance Recommendations

Retrieve performance optimization recommendations from the Atlas Performance Advisor. Get suggested indexes and slow query logs for a specific MongoDB process to identify and resolve performance bottlenecks.

### List Events

Retrieve audit events for a MongoDB Atlas project or organization. Track changes like cluster creation/deletion, user modifications, alert triggers, backup events, and other administrative operations.

### List Projects

Lists all MongoDB Atlas projects (groups) accessible to the authenticated user. Can also retrieve details of a specific organization. Use this to discover available projects and their IDs for use with other tools.

### Manage Alerts

Create, update, list, or delete alert configurations in a MongoDB Atlas project. Configure metric-based alerts (CPU, memory, disk, connections) and event-based alerts (host down, failover). Set up notification channels including webhooks, email, Slack, PagerDuty, Datadog, OpsGenie, and Microsoft Teams. Also allows viewing and acknowledging active alerts.

### Manage Backups

Manage cloud backup snapshots and restore jobs for MongoDB Atlas clusters. List existing snapshots, take on-demand snapshots, view backup schedules, create restore jobs (automated or download), and update backup policies.

### Manage Cluster

Create, update, or retrieve MongoDB Atlas clusters. Supports dedicated (M10+), and shared-tier clusters. Use this to provision new clusters, scale existing ones, change MongoDB versions, or get cluster details.

### Manage Database User

Create, update, list, or delete database users in a MongoDB Atlas project. Configure authentication methods (SCRAM, X.509, AWS IAM, LDAP, OIDC), assign roles for fine-grained access control, and scope users to specific clusters.

### Manage IP Access List

Manage the IP access list (whitelist) that controls which IP addresses can connect to Atlas clusters in a project. Add, list, or remove IP addresses, CIDR blocks, or AWS security groups.

### Manage Network Peering

Manage VPC/VNet network peering connections between MongoDB Atlas and your cloud provider (AWS, Azure, GCP). List, create, view, or delete peering connections to enable private network communication with your clusters.

### Manage Online Archive

Configure Online Archive rules to automatically move infrequently accessed data from Atlas clusters to cheaper cloud object storage. Archived data remains queryable through federated queries.

### Manage Search Indexes

Create, update, list, or delete Atlas Search indexes on MongoDB collections. Configure analyzers, field mappings, and synonyms for full-text search capabilities.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
