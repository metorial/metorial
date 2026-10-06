# LogDNA

Search, download, ingest, and manage LogDNA log data using the Log Analysis API. The integration contains 34 tools for paginated log exports, saved views, preset alert templates, boards, categories, exclusion rules, archive configuration, ingestion controls, and byte usage reports.

## Authentication

Use an IAM access token for new management connections. Existing service-key connections remain supported. Choose the documented account API host: `api.mezmo.com` or `api.logdna.com`. Sending logs requires a separate ingestion key; management credentials cannot replace it.

## Common workflows

- Use `download_log_export` for a downloadable JSONL page. Repeat the same range, filters, size, and ordering with the returned pagination ID to continue. The deprecated `export_logs` key retains its original service-key routing to `api.logdna.com`; IAM tokens and other account hosts require the downloadable replacement.
- Create and update saved views, with optional categories and notification channels. Preset alerts are reusable templates attached to views.
- List, retrieve, create, and delete boards. The create endpoint accepts an empty board; configure its graphs in the provider dashboard.
- Inspect and manage exclusion rules, categories, and the account's single archive configuration.
- Inspect ingestion status and byte usage. Account-wide ingestion suspension requires the returned confirmation token before it takes effect.

Exports accept time range, query, hosts, apps, levels, size, and ordering. Put tag conditions in the query. For ingestion file metadata, use `meta.file`.

## Verification

An active private live suite covers all registered tools with owned-resource readback and cleanup. Paid ingestion, notification configuration, account-wide controls, and archive changes require explicit test fixtures. See [API specification](docs/SPEC.md) for API boundaries and sources.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
