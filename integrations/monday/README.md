# <img src="https://provider-logos.metorial-cdn.com/monday.png" height="20"> Monday.com

Manage monday.com boards, items, groups, columns, updates, workspaces, folders, webhooks, users, teams, tags, notifications, and activity logs through the monday.com GraphQL API.

This integration pins monday.com API requests to the current stable `2026-04` version.

## Tools

### Boards

- `list_boards`: Retrieve board metadata, columns, groups, and owners.
- `create_board`: Create a board, including `2026-04` empty-board and prompt options.
- `update_board`: Update board name or description, archive a board, or delete a board.
- `duplicate_board`: Duplicate a board with structure, items, or items and updates.
- `move_board`: Move a board to a workspace/folder or update its hierarchy position.

### Items and Sub-items

- `list_items`: Retrieve specific items or board items with cursor pagination, group filtering, `items_page` filters, sorting, and hierarchy scope.
- `create_item`: Create an item with optional group and initial column values.
- `update_item`: Update column values, move an item to a group, archive an item, or delete an item.
- `duplicate_item`: Duplicate an item or sub-item.
- `move_item`: Move an item to a group, a board position, or another board.
- `set_item_description`: Replace an item's `2026-04` markdown description content.
- `create_subitem`: Create a sub-item under a parent item.

### Groups and Columns

- `list_groups`, `create_group`, `update_group`: Read and manage board groups.
- `list_columns`, `create_column`, `update_column_metadata`, `delete_column`: Read and manage board column definitions.

### Updates

- `list_updates`: Read item or account updates.
- `create_update`: Post an update or reply.
- `edit_update`: Edit update body content.
- `react_to_update`: Like or unlike an update.
- `pin_update`: Pin or unpin an update.
- `clear_item_updates`: Clear all updates from an item.
- `delete_update`: Delete an update.

### Account Resources

- `list_workspaces`, `create_workspace`, `update_workspace`: Read and manage workspaces.
- `list_folders`, `create_folder`, `update_folder`, `delete_folder`: Read and manage workspace folders.
- `list_webhooks`, `create_webhook`, `delete_webhook`: Read and manage board webhooks.
- `list_users`, `list_teams`, `list_tags`: Read account users, teams, and tags.
- `send_notification`: Send a notification linked to an item or board target.
- `get_activity_logs`: Read board activity logs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
