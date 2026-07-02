# <img src="https://provider-logos.metorial-cdn.com/new-relic.png" height="20"> New Relic

Query telemetry data using NRQL across metrics, events, logs, and traces. Create and manage alert conditions, policies, and notification workflows. Build and update dashboards with custom widgets and charts. Search, tag, and manage monitored entities such as applications, hosts, and services. Configure synthetic monitors to proactively detect issues. Ingest custom metrics, events, logs, and distributed tracing spans via dedicated APIs. Track deployments and change events. Manage workloads, user groups, roles, and API keys. Set up alert notifications to destinations like Slack, PagerDuty, Jira, email, and webhooks.

## Tools

### Create Change Tracking Marker

Record a deployment or change event for an entity. Change tracking markers appear on New Relic charts, allowing you to correlate deployments with performance changes.

### Ingest Data

Send custom telemetry data to New Relic. Supports ingesting **metrics**, **events**, **logs**, and **traces** via the respective ingest APIs. Requires a License Key to be configured in authentication.

### Manage Alert Condition

Create, update, or delete NRQL-based alert conditions. Alert conditions define thresholds that trigger incidents. Supports both **static** (fixed threshold) and **baseline** (anomaly detection) condition types.

### Manage Dashboard

Create, read, update, or delete New Relic dashboards. Dashboards consist of pages containing widgets (charts, tables, billboards, markdown), each driven by NRQL queries.

### Manage Entity Tags

Add, replace, or delete tags on a New Relic entity. Tags help organize and filter entities across your environment.

### Manage Synthetic Monitor

Create or delete synthetic monitors. Synthetics simulate user interactions or API calls to proactively detect availability and performance issues. Supports ping monitors, simple browser monitors, scripted browser tests, and scripted API tests.

### Run NRQL Query

Execute an NRQL (New Relic Query Language) query against your telemetry data. Use this to query metrics, events, logs, and traces stored in New Relic. Supports filtering, aggregation, faceting, and time-series analysis with SQL-like syntax.

### Search Entities

Search and discover entities monitored by New Relic. Entities include applications, hosts, services, dashboards, and cloud integrations. Use a query string with New Relic entity search syntax. Supports filtering by type, domain, name, tags, and alert severity.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
