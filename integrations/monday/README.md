# <img src="https://provider-logos.metorial-cdn.com/monday.png" height="20"> Mondaycom

Create, read, update, and delete boards, items, sub-items, groups, and columns to manage projects and workflows. Post updates and replies on items for team communication. Manage workspaces, folders, documents (Workdocs), users, teams, tags, and file assets. Upload files, send notifications, query activity logs and dashboards, and configure webhooks for real-time event notifications on boards. Supports a wide variety of column types including status, date, people, timeline, dropdown, and more.

## Tools

### Create Board

Create a new board in Monday.com. Specify the board name, visibility type, and optionally assign it to a workspace or folder.

### Create Item

Create a new item (row) on a Monday.com board. Optionally place it in a specific group and set initial column values. Column values should be a JSON object mapping column IDs to their values, formatted per Monday.com's column value specification.

### Create Sub-item

Create a sub-item under a parent item. Sub-items are nested items that appear within the parent item. Optionally set initial column values.

### Get Activity Logs

Retrieve activity log entries for one or more boards. Activity logs capture a history of changes and actions performed on the board, including item creation, column updates, status changes, etc.

### List Boards

Retrieve boards from the Monday.com account. Supports filtering by board IDs, workspace, board kind, and state. Returns board metadata including columns, groups, and owners.

### List Items

Retrieve items from a board or by item IDs. When fetching by board, supports pagination via cursor and filtering by group. Returns item data including column values and sub-item references.

### List Tags

Retrieve all tags in the Monday.com account. Tags are used to label and categorize items across boards.

### List Teams

Retrieve teams from the Monday.com account. Optionally filter by team IDs. Returns team members and owners.

### List Users

Retrieve users from the Monday.com account. Filter by user IDs, email addresses, or name. Returns user profile details and team memberships.

### List Columns

Retrieve all columns (fields) defined on a board. Returns column metadata including type, title, and settings.

### List Groups

Retrieve all groups from a board. Groups are sections that organize items within a board.

### List Updates

Retrieve updates (comments/discussions) from an item or by update IDs. Updates include threaded replies.

### List Workspaces

Retrieve workspaces from the Monday.com account. Workspaces are organizational containers that hold boards, dashboards, and folders.

### Send Notification

Send a notification to a specific user on behalf of the authenticated user. The notification is linked to a target item on a board.

### Update Board

Update a board's properties such as name, description, or communication settings. Can also archive or delete a board.

### Update Item

Update an item's column values, move it to a different group, archive it, or delete it. For column value updates, provide a JSON object mapping column IDs to their new values.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
