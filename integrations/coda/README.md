# <img src="https://provider-logos.metorial-cdn.com/coda.svg" height="20"> Coda

Create, read, update, and delete docs, pages, tables, and rows in Coda's collaborative document platform. Manage folders, sharing permissions, and doc publishing. Insert, upsert, and query table rows with sync token support for incremental updates. Trigger button actions and webhook-invoked automations programmatically. Read formula values and control states. Export page content to HTML or Markdown. Track doc and Pack usage analytics. Register webhooks for row change events. Resolve browser URLs to API resources and monitor asynchronous mutation status.

## Tools

### Create Doc

Create a new Coda doc, optionally from an existing doc as a template. The doc can be placed in a specific folder and timezone.

### Create Page

Create a new page in a Coda doc. Supports setting a name, subtitle, icon, cover image, parent page for nesting, and initial HTML content.

### Delete Doc

Permanently delete a Coda doc. This action cannot be undone.

### Delete Page

Permanently delete a page from a Coda doc. This action cannot be undone.

### Delete Rows

Delete one or more rows from a Coda table. Provide a list of row IDs to remove. This action cannot be undone.

### Get Doc Analytics

Retrieve usage analytics for Coda docs, including views, sessions, copies, and likes. Filter by doc IDs, workspace, date range, or published status.

### Get Doc

Retrieve detailed metadata for a specific Coda doc, including its title, owner, workspace, folder, creation/update timestamps, and publishing status.

### Get Formulas and Controls

Retrieve named formulas and interactive controls (sliders, checkboxes, select boxes, etc.) from a Coda doc, including their current computed values.

### Get Mutation Status

Check the completion status of an asynchronous write operation using the request ID returned from mutation endpoints (row inserts, updates, deletes, etc.).

### Get Page Content

Retrieve the content of a specific page in a Coda doc. Supports exporting as HTML or Markdown format.

### Get Row

Retrieve a single row from a table by its ID or name, including all cell values.

### List Columns

List all columns in a table or view, including their names, IDs, types, and format information. Useful for discovering the schema of a table before reading or writing rows.

### List Docs

Search and list Coda docs accessible to the authenticated user. Filter by ownership, workspace, folder, starred status, or search query. Returns doc metadata including titles, IDs, and timestamps.

### List Pages

List all pages in a Coda doc. Returns page names, IDs, subtitles, icons, and parent page relationships.

### List Rows

List rows from a table or view in a Coda doc. Supports filtering by column value, sorting, pagination, and incremental sync via sync tokens. Returns row IDs, names, and cell values.

### List Tables

List all tables and views in a Coda doc, including their column definitions, row counts, and layout types.

### List Folders

List folders accessible to the authenticated user. Optionally filter by workspace or starred status.

### List Permissions

List all sharing permissions on a Coda doc, including who has access and at what level (read, write, comment). Also returns ACL settings.

### Publish Doc

Publish a Coda doc or update its publishing settings, including slug, discoverability, interaction mode, and category assignments.

### Push Button

Programmatically trigger a button column on a specific row in a Coda table. The button executes whatever action is configured in the doc (e.g., writing to other tables, running Pack actions).

### Resolve URL

Resolve a Coda browser URL into its API resource representation. Converts a user-facing link (to a doc, page, table, row, etc.) into the corresponding API-addressable resource IDs.

### Trigger Automation

Trigger a webhook-invoked automation rule in a Coda doc by sending a JSON payload. The payload is accessible within the automation as "Step 1 Result". The automation must be pre-configured with a "Webhook invoked" trigger in the doc.

### Update Doc

Update the properties of an existing Coda doc, such as its title or icon.

### Update Page

Update the properties of an existing page in a Coda doc, including name, subtitle, icon, and cover image. Can also append content to the page.

### Update Row

Update specific cell values of an existing row in a Coda table. Only the provided cells are updated; other cells remain unchanged.

### Upsert Rows

Insert or upsert one or more rows into a Coda table. When **keyColumns** are provided, existing rows matching the key values are updated instead of creating duplicates. Each row is specified as an array of column-value cell pairs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
