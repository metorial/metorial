# <img src="https://provider-logos.metorial-cdn.com/smartsheet.png" height="20"> Smartsheet

Create, read, update, and delete sheets, rows, columns, and cells in a spreadsheet-like work management platform. Organize work into workspaces and folders with granular sharing permissions. Manage attachments, discussions, and comments on sheets and rows. Build and access dashboards and reports that aggregate data across sheets. Search across sheets, send sheets or rows via email, and create update requests for collaborators. Manage users, groups, contacts, and favorites. Set up webhooks for real-time change notifications on sheets and account-level events. Support cross-sheet references, automation rules, proofing workflows, templates, and event reporting for auditing actions.

## Tools

### Create Sheet

Create a new sheet with specified columns. Optionally create the sheet inside a folder or workspace. You can also create a sheet from a template by providing a template ID.

### Create Update Request

Send update requests to collaborators asking them to update specific rows in a sheet. Recipients receive an email with a link to update the specified rows.

### Delete Rows

Delete one or more rows from a sheet by their IDs. This permanently removes the rows and their data.

### Delete Sheet

Permanently delete a sheet. This action cannot be undone.

### Get Sheet

Retrieve a sheet's full data including columns, rows, and cell values. Optionally filter by specific columns or rows. Use this to read sheet structure and data.

### List Dashboards

List all dashboards accessible to the current user, or get details for a specific dashboard. Dashboards (also known as Sights) aggregate information from sheets and reports into visual displays.

### List Reports

List all reports accessible to the current user, or get the full data for a specific report. Reports aggregate data from multiple sheets and are read-only.

### List Sheets

List all sheets accessible to the current user. Returns sheet metadata including names, IDs, access levels, and timestamps. Use pagination parameters to control result size.

### Manage Columns

Add, update, or delete columns on a sheet. Use the **action** field to specify the operation. When adding columns, provide column definitions. When updating, provide the column ID and fields to change. When deleting, provide the column ID.

### Manage Discussions

List, create, or reply to discussions on sheets and rows. Discussions are threaded comment collections attached to a sheet or a specific row. Use **action** to specify the operation.

### Manage Folders

Create, list, update, or delete folders. Folders can be created at the home level, inside a workspace, or as subfolders within other folders. Use the **action** field to specify the operation.

### Add Rows

Add one or more rows to a sheet. Each row contains cell values mapped to column IDs. Rows can be positioned at the top, bottom, or relative to other rows.

### List Users

List all users in the organization account. Can filter by email address. Requires admin-level access or READ_USERS scope.

### List Workspaces

List all workspaces accessible to the current user. Workspaces are top-level containers for organizing sheets, reports, and dashboards.

### Search

Search across all accessible sheets or within a specific sheet. Returns matching results with context including the object type, parent sheet, and matched text.

### Send Sheet via Email

Send a sheet or specific rows via email to one or more recipients. Supports formatting options and optional CC to self.

### Share Resource

Share a sheet or workspace with users. Can list current shares, add new shares, update access levels, or remove shares. Access levels include VIEWER, EDITOR, EDITOR_SHARE, ADMIN, and OWNER.

### Update Rows

Update one or more existing rows in a sheet. Can modify cell values, move rows to different positions, lock/unlock rows, or change their parent hierarchy.

### Update Sheet

Update a sheet's properties such as its name. Can also copy or move a sheet to a different folder or workspace.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
