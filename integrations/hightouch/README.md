# <img src="https://provider-logos.metorial-cdn.com/hightouch.png" height="20"> Hightouch

Manage reverse ETL pipelines that sync data from warehouses to 200+ SaaS destinations. Create and configure sources, destinations, models, and syncs. Trigger syncs and sync sequences on demand, monitor sync run history with status and error details, and serve low-latency personalization data via collection queries. Supports field mappings, sync modes (upsert, insert, update, mirror), and integration with orchestration tools.

## Tools

### List Destinations

List all destinations configured in your Hightouch workspace. Destinations are the SaaS tools and services (CRMs, ad platforms, marketing tools, etc.) where Hightouch sends data. Supports pagination.

### List Models

List models in your Hightouch workspace. Models define which data to pull from a source. Supports filtering by name or slug and pagination.

### List Sources

List data sources connected to your Hightouch workspace. Sources are the data warehouses, databases, or other systems from which Hightouch pulls data. Supports pagination via limit and offset.

### List Syncs

List syncs in your Hightouch workspace. Syncs move data from models to destinations with configurable field mappings and scheduling. Supports filtering by model ID or slug and pagination.

### List Sync Runs

List run history for a specific sync, including status, row counts (added/changed/removed), error details, and timing. Useful for monitoring and debugging sync execution. Supports filtering by time range and pagination.

### Trigger Sync

Trigger a sync to run on demand. You can trigger by sync ID or slug. Optionally perform a full resync (ignoring previously synced rows) or reset CDC state. Useful for integrating Hightouch into data pipelines and orchestration workflows.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
