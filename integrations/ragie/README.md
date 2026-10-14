# Ragie

Ingest documents from public URLs or raw text and JSON, inspect processing status, and retrieve relevant content with metadata filtering, reranking, recency bias, and chunk diversity controls. Read document chunks with pagination and download original source files. Generate answers with deep search, manage entity extraction instructions, and inspect extracted entities. Manage data source connections and organize documents into partitions for multi-tenant isolation.

Use `list_partitions` to discover partition identifiers and current settings. The legacy `manage_partitions` list action retains its original output contract; when Ragie omits the required timestamps, it reports a clear error directing callers to `list_partitions`. Creating and inspecting partitions return the actual fields provided by Ragie.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
