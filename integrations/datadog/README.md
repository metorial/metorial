# <img src="https://provider-logos.metorial-cdn.com/datadog-logo.png" height="20"> Datadog

Monitor infrastructure, applications, and services across cloud environments. Submit and query metrics, create and manage monitors and alerts, build dashboards, search and analyze logs, manage incidents, track SLOs, run synthetic tests, and configure integrations with cloud providers. Create on-call schedules, automate workflows, manage users and roles, handle security monitoring and detection rules, submit DORA metrics, and retrieve usage and cost data. Supports outbound webhooks for alert notifications.

## Tools

### Delete Monitor

Delete a Datadog monitor by its ID. Optionally force-delete monitors that are referenced by other resources.

### Get Dashboard

Get full details of a specific Datadog dashboard by ID, including all widget definitions and template variables.

### List Dashboards

List all Datadog dashboards in the organization. Returns a summary of each dashboard including title, layout type, and author.

### List Events

List events from the Datadog event stream within a time range. Filter events by priority, source, or tags.

### List Hosts

List infrastructure hosts monitored by Datadog. Filter by name and sort by various fields. Returns host details including apps, tags, and status.

### List Incidents

List Datadog incidents. Returns incident details including title, severity, state, and customer impact status.

### List Monitors

List and search Datadog monitors. Retrieve monitors filtered by name, tags, or state. Returns monitor details including current alert state.

### List SLOs

List Datadog Service Level Objectives. Filter SLOs by query, tags, or specific IDs.

### List Synthetics Tests

List all Datadog Synthetics tests. Returns test configurations, statuses, and associated metadata for API and browser tests.

### List Users

List users in the Datadog organization. Filter by status or search by name/email.

### Manage Dashboard

Create or update a Datadog dashboard. Dashboards contain widgets that visualize metrics, logs, traces, events, and other data sources.

### Manage Incident

Create or update a Datadog incident. Incidents track and manage service disruptions including severity, customer impact, and resolution status.

### Manage Monitor

Create or update a Datadog monitor. Monitors evaluate queries and trigger alerts based on threshold conditions. Supports metric alerts, log alerts, anomaly detection, forecast, outlier, APM, and composite monitors.

### Manage SLO

Create or update a Datadog Service Level Objective. SLOs track the reliability of your services using monitor-based or metric-based measurements.

### Get Synthetics Test

Get details and recent results of a Datadog Synthetics test by its public ID. Includes test configuration and latest results.

### Mute/Unmute Monitor

Mute or unmute a Datadog monitor. Muting suppresses notifications for the monitor. Optionally scope the mute to specific groups and set an end time.

### Post Event

Post an event to the Datadog event stream. Events represent deployments, alerts, configuration changes, or any significant occurrence in your environment.

### Query Metrics

Query timeseries metric data from Datadog. Retrieve metric values over a specified time range using Datadog's query language. Use metric queries like \

### Schedule Downtime

Schedule a downtime to temporarily mute monitoring notifications. Target specific monitors by ID or by tags, and scope the downtime to specific resources.

### Search Logs

Search and retrieve logs from Datadog using query syntax. Filter logs by time range, service, status, and custom attributes. Uses the Datadog log search query language, e.g. \

### Submit Logs

Send log entries directly to Datadog. Submit one or more log messages with optional source, tags, hostname, and service metadata.

### Submit Metrics

Submit custom metric data points to Datadog. Send one or more metric series with their values, timestamps, tags, and hosts.

### Trigger Synthetics Tests

Trigger one or more Datadog Synthetics tests on demand. Useful for running tests as part of CI/CD or verifying service health.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
