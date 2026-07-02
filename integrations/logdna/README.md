# <img src="https://provider-logos.metorial-cdn.com/logdna.png" height="20"> Logdna

Ingest, search, export, and manage log data from any source. Send log lines with custom metadata, export logs in JSONL format with filtering by time range, hosts, apps, levels, and tags. Create and manage saved views, categories, and dashboards (boards) for log monitoring. Configure preset and view-specific alerts via email, webhook, PagerDuty, or Slack. Set up exclusion rules to filter out unwanted logs, manage archiving to third-party storage like Amazon S3, control ingestion status (suspend/resume), and retrieve aggregated usage reports for apps, hosts, and tags.

## Tools

### Export Logs

Search and export log lines from LogDNA in JSONL format. Filter by time range, search query, hosts, apps, levels, and tags. Supports pagination for large result sets using the v2 API.

### Get Usage

Retrieve aggregated log usage information for the LogDNA account. Can be broken down by apps, hosts, or tags. Usage is reported as bytes used, with daily granularity.

### Ingest Logs

Send log lines to LogDNA for ingestion. Supports sending one or more log lines in a single request, each with optional metadata, app name, log level, and environment. Requires a hostname to identify the source. The ingestion key must be configured in authentication settings.

### Get Ingestion Status

Get the current data ingestion status for the LogDNA instance. Returns whether ingestion is active or suspended.

### List Preset Alerts

List all preset (account-wide) alerts. Preset alerts apply globally across all log data, unlike view-specific alerts.

### Get Archive Configuration

Retrieve the current archiving configuration for long-term log storage. Only one archiving configuration may exist at a time.

### List Boards

List all boards (dashboards) in the LogDNA account. Boards are visual dashboards composed of graphs and widgets for monitoring log data.

### List Categories

List all categories of a given type. Categories allow logical grouping of views.

### List Exclusion Rules

List all ingestion exclusion rules. Exclusion rules define which logs should be excluded from storage to control costs and reduce noise.

### List Views

List all saved log views in the LogDNA account. Views are saved log queries with optional alert configurations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
