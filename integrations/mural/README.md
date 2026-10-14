# <img src="logo.svg" height="20"> Mural

Manage Mural canvases, rooms, templates, widgets, tags, and workshop facilitation with OAuth. Discover workspaces and rooms, create and duplicate murals, search content, invite or remove collaborators, and run timers, voting sessions, and private mode.

Use `list_workspaces` and `list_rooms` to discover destination IDs before creating a mural. `get_workspace` and `get_room` retrieve container details; `delete_widget` removes canvas content. List and search tools expose pagination cursors.

Creating images requires a previously uploaded Mural asset name. Creating arrow connectors requires geometry and path points. Enterprise API keys belong to Mural's separate administrative API and cannot authorize these canvas tools. Workspace invitations require the `workspaces:write` scope and workspace-admin permissions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
