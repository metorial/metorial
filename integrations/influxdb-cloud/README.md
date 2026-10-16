# InfluxDB Cloud

Write and query time-series data with the InfluxDB Cloud TSM/v2 API using line protocol and Flux. Discover organizations and buckets; manage retention, scheduled tasks, dashboards, labels, API-token authorizations, secrets, Telegraf configurations, and DBRP mappings. Inspect monitoring checks, notification endpoints and rules, current-user identity, and task-run logs.

This integration targets InfluxDB Cloud TSM and the documented InfluxDB 2 API. InfluxDB 3, Cloud Serverless, SQL, and Flight are separate products and are not provided by these tools.

Connect with an API token and the existing region or instance URL. Call `list_organizations` to discover organization IDs, then pass `orgId` to organization-scoped tools. Existing connections retain their saved organization as a fallback. Cloud discovery returns only the organization owning the token; OSS visibility depends on token permissions. The configured server URL, port, and proxy path retain their existing meaning.

Flux queries return the original annotated CSV, including table boundaries and timestamp precision. Optional `params` and `now` support documented query parameters. List tools return one provider page with raw paging links where the endpoint supplies them. Bucket and task lists also accept an `after` ID instead of `offset`.

A successful write or data-delete response confirms request acceptance. Cloud processes writes and deletes asynchronously; data visibility can lag behind acknowledgement. Retention is measured in seconds: `0` means infinite retention, and new buckets default to 2,592,000 seconds (30 days). API-token values may only be available immediately after creation; save them securely.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
