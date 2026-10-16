# Felt

Create, share, and manage interactive Felt maps. Configure map settings and permissions, import geographic data from public URLs, update layer styling, refresh URL-backed layers, and download layer data or map comments. Read grouped annotations, organize maps in projects, manage data sources, check asynchronous source operations, and create tokens for private embedded maps.

The REST API requires a Felt Enterprise workspace API token. Create one in Workspace Settings → Developers. API tokens are workspace-scoped.

Call `list_projects` and `get_project` to discover maps, and `list_sources` and `get_source` to discover sources and check their status. URL imports require a display name in Felt. File-backed layer refreshes require a replacement file upload and are not completed by this integration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
