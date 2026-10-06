# Stitch

Manage Stitch Data sources, warehouse destinations, stream selection, schedules and notifications. Validate or ingest JSON records, inspect recent job history, and download extraction logs.

Connect tools require an account access token from Account Settings and an eligible plan. Import tools require a separate source token from Integration Settings. Set the account region when connecting; existing connections retain their saved region. Source metadata supplies the account ID when available. An optional configured client ID remains available for empty accounts and Import-only validation.

| Tools | Purpose |
| --- | --- |
| `list_sources`, `get_source`, `create_source`, `update_source`, `delete_source` | Source discovery and configuration |
| `list_source_types` | Available types and required connection properties |
| `get_destination`, `create_destination`, `update_destination`, `delete_destination` | Warehouse configuration and type discovery |
| `list_streams`, `get_stream`, `update_stream_selection` | Table schemas, field selection and replication metadata |
| `start_replication`, `stop_replication` | Start extraction or request cancellation |
| `list_extractions`, `list_loads` | One page of recent job history, with continuation |
| `get_extraction_logs` | Download a log file |
| `list_notifications`, `manage_custom_email`, `manage_post_load_hook` | Notification recipients and post-load callbacks |
| `push_data`, `validate_data`, `get_import_status` | Ingestion, non-persistent validation and regional API health |

A destination's name can be set during creation; renaming through the documented update API is unavailable. Update its connection properties or rename it in the dashboard. Standard plans support one destination; other plans may support multiple destinations. Creating a destination can map unmapped sources unless `ignoreUnmappedSources` is true.

Batch acceptance does not confirm warehouse loading. Stopping extraction does not cancel already buffered loads or erase destination data. Connection credentials are excluded from returned properties; hook URLs expose only their origin.

Extraction listing contains the latest completed run per source from the past 60 days, rather than active jobs or full run history. Failed connection checks remain available as diagnostic results. Stream updates and deletions require the documented provider acknowledgments before reporting success.

[Developer documentation](https://help.qlik.com/en-US/stitch/developers) · [Connect API](https://www.stitchdata.com/docs/developers/stitch-connect/api) · [Import API](https://help.qlik.com/en-US/stitch/developers/import-api/api)

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
