# Roam

Create, read, update, and delete pages and blocks in a Roam Research graph database of networked notes. Query the graph using Datalog for flexible data retrieval across interconnected pages and blocks. Pull structured data for specific entities, add content to daily note pages, and optionally download one retrieved page as locally generated JSON. Uses backend graph tokens for non-encrypted hosted graphs. Graph names match the visible Roam graph URL. Read-only tokens can read; writes need read+edit permission. Desktop-local and append-only credentials are not interchangeable. No account identity or complete-graph export is claimed.

Daily capture requires an existing exact MM-DD-YYYY page UID; missing pages fail before writing. Write outcomes are read back using exact UIDs. Lost, rejected or partially completed writes can retain graph changes; inspect their original target UIDs before retrying. Deletion does not erase backups, logs or history.

Supports Roam markup syntax including page references, tags, block references, and TODO markers.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
