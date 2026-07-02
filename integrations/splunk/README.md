# <img src="https://provider-logos.metorial-cdn.com/splunk.png" height="20"> Splunk

Search, monitor, and analyze machine-generated data such as logs, metrics, and events. Execute searches using Splunk Processing Language (SPL), create and manage search jobs, and retrieve results in JSON, XML, or CSV. Ingest data via the HTTP Event Collector (HEC) in JSON or raw text format. Create and manage saved searches, alerts, and webhook-based alert actions. Manage indexes, data inputs, and knowledge objects such as event types, field extractions, lookups, tags, and macros. Store and query application state using the KV Store with MongoDB-like queries. Manage dashboards, views, users, roles, apps, and server configuration.

## Tools

### Get Search Results

Retrieve the status and results of a previously created search job. Returns the job's dispatch state and, if the search is complete, the result rows. Supports pagination with count and offset.

### Get Server Info

Retrieve Splunk server information including server name, version, build number, OS, CPU architecture, and license state. Useful for verifying connectivity and server status.

### List Fired Alerts

List recently fired alerts on the Splunk instance. Returns alert names, trigger counts, and identifiers. Useful for monitoring alert activity.

### List Users

List Splunk users on the instance. Returns username, real name, email, assigned roles, and default app. Supports pagination.

### List Indexes

List data indexes on the Splunk instance. Returns index name, data type, size, event count, retention settings, and status. Supports filtering and pagination.

### List KV Store Collections

List all KV Store collections within a given Splunk app. Returns collection names, field definitions, and ownership info.

### List Saved Searches

List saved searches configured on the Splunk instance. Returns search name, query, schedule, and alert configuration. Supports filtering and pagination.

### Run Search

Execute an SPL (Search Processing Language) query against Splunk. Supports both **oneshot** (blocking, returns results immediately) and **async** (creates a search job, returns a job ID for later retrieval) execution modes. Use oneshot mode for quick searches and async mode for long-running or complex queries.

### Send HEC Event

Send one or more events to Splunk via the HTTP Event Collector (HEC). Supports JSON-formatted events with optional metadata (host, source, sourcetype, index, timestamp). Requires an HEC token configured in authentication settings.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
