# <img src="logo.png" height="20"> Needle

Manage Needle document collections, add and remove indexed files, retrieve indexing statistics, and search document passages. Generate upload URLs for local files and download existing files. Inspect files synchronized by data source connectors.

Create an API key in Needle Developer Settings. Collection IDs are available through `list_collections`; connector IDs are available through `list_connectors` when Needle reports collection assignments, or in the dashboard.

The tools target Needle's document collection and RAG API. `get_collection_stats` reports unknown byte sizes as null. The existing `get_collection` and `list_connectors` tools report a clear error if the provider omits byte sizes or collection assignments required by their response contracts.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
