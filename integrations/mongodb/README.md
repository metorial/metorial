# <img src="https://provider-logos.metorial-cdn.com/mongodb.png" height="20"> Mongodb

Manage MongoDB Atlas cloud database infrastructure programmatically. Create, scale, update, pause, and delete clusters across AWS, Azure, and GCP. Manage organizations, projects, database users, and custom roles. Configure cloud backups, take on-demand snapshots, and initiate restores. Set up network security including IP access lists, VPC peering, and private endpoints. Configure encryption at rest with customer-managed keys. Monitor cluster performance with host metrics, disk measurements, and log downloads. Create and manage alert configurations with webhook notifications. Integrate with third-party services like Datadog, PagerDuty, and Slack. Create and manage Atlas Search indexes and search nodes. Set up data federation, online archives, and stream processing pipelines. Configure federated authentication with SAML and OIDC identity providers. Retrieve invoices, billing details, and cost analysis. Perform live migrations from self-managed MongoDB deployments. Note: manages infrastructure only — does not provide direct access to data stored in clusters.

## Tools

### Get Billing

Retrieve invoices and pending charges for a MongoDB Atlas organization. View past invoices, current pending charges, and individual invoice details including line items.

### Get Metrics

Retrieve host process metrics, disk measurements, or list available processes for a MongoDB Atlas project. Supports common metrics like connections, opcounters, memory, CPU, and disk utilization. Use this to monitor cluster health and performance.

### Get Network Info

List network peering connections and private endpoint services for a MongoDB Atlas project. Use this to review the network security configuration of your clusters.

### List Clusters

List all database clusters in a MongoDB Atlas project. Returns cluster names, states, configurations, and connection strings. Use the configured projectId or provide one explicitly.

### List Events

List activity feed events for a MongoDB Atlas project or organization. Events include configuration changes, user actions, cluster state changes, and system events. Useful for auditing and monitoring activity.

### List Organizations

List all MongoDB Atlas organizations accessible with the current credentials. Organizations are the top-level entity containing projects and users.

### List Projects

List all MongoDB Atlas projects accessible with the current credentials. Projects (also called "groups") are the primary containers for clusters, database users, and other resources. Use this to discover available projects before performing project-scoped operations.

### Manage Alert Configurations

List, create, update, or delete alert configurations for a MongoDB Atlas project. Alert configurations define what conditions trigger alerts and how notifications are sent (webhook, email, Slack, PagerDuty, etc.).

### Manage Alerts

List, get, or acknowledge alerts for a MongoDB Atlas project. Alerts notify about conditions like host downtime, replication lag, high CPU, disk utilization, and many other metrics and events.

### Manage Backups

List backup snapshots, take on-demand snapshots, list restore jobs, or create restore jobs for a MongoDB Atlas cluster. Supports automated and point-in-time restores to the same or different clusters.

### Manage Cluster

Create, update, delete, pause, or resume a MongoDB Atlas cluster. Supports configuring cloud provider, region, instance tier, auto-scaling, replication, and sharding settings. Also supports getting detailed cluster information.

### Manage Database User

Create, update, list, or delete database users in a MongoDB Atlas project. Database users authenticate to MongoDB databases with specific roles and privileges. Supports SCRAM, X.509, LDAP, and AWS IAM authentication types.

### Manage IP Access List

List, add, or remove IP addresses and CIDR blocks from a project's IP access list. The IP access list controls which IP addresses can connect to your Atlas clusters. You can also add temporary entries with expiration dates.

### Manage Project

Get details about a specific project, create a new project, or delete an existing project. Projects are the primary containers for clusters, database users, and network configurations in MongoDB Atlas.

### Manage Search Indexes

List, create, update, or delete Atlas Search indexes on MongoDB Atlas collections. Atlas Search enables full-text search, faceted search, and vector search capabilities on your data.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
