# <img src="https://provider-logos.metorial-cdn.com/notion.svg" height="20"> Notion

Create, read, update, and archive pages and databases in a Notion workspace. Manage blocks (paragraphs, lists, headings, embeds, etc.) within pages. Query databases with filters and sorts across rich property types including text, numbers, dates, selects, relations, and formulas. Search across pages and databases by title. Add and read comments on pages and blocks. Upload files to pages. Manage workspace users and retrieve user profiles. Receive real-time webhook notifications for page changes, new pages, comments, and database schema updates.

## Tools

### Add Comment

Add a comment to a Notion page or reply to an existing discussion thread. Comments can be placed at the top of a page or as a reply to an existing discussion.

### Append Blocks

Append new content blocks to a page or an existing block. Supports all Notion block types including paragraphs, headings, lists, to-dos, code blocks, callouts, images, embeds, and more. Blocks can be nested up to 2 levels deep in a single request.

### Create Database

Create a new database in Notion as a child of an existing page. Define the database schema by specifying property names and types. Supported property types include title, rich_text, number, select, multi_select, date, people, files, checkbox, url, email, phone_number, formula, relation, rollup, status, and more.

### Create Page

Create a new page in Notion as a child of an existing page or as an entry in a database. Provide a parent (either a page ID or database ID) and properties. For database parents, properties must match the database schema. Optionally include initial content as block children, and set an icon or cover image.

### Delete Block

Delete a block from a Notion page. This sets the block to archived and moves it to trash. Can also be used to delete page blocks (effectively trashing a page).

### Get Block Children

Retrieve the child blocks of a given block or page. Returns the first level of children only. Use a page ID to get the top-level content of a page, or a block ID to get nested content within a specific block. Results are paginated; use the cursor to retrieve additional blocks.

### Get Database

Retrieve a Notion database by its ID, including its schema (properties), title, description, and metadata. Use this to inspect a database's structure before querying or creating entries.

### Get Page

Retrieve a Notion page by its ID, including all properties, metadata, and optionally its content blocks. Use this to read a page's title, properties, timestamps, parent info, icon, cover, and block content.

### List Comments

Retrieve unresolved comments on a Notion page or block. Returns comment text, author, timestamps, and discussion thread IDs. Only unresolved comments are returned.

### List Users

List all users in the Notion workspace, including admins, members, guests, and bot integrations. Returns user profiles with name, avatar, type, and optionally email addresses (requires user information capability).

### Query Database

Query a Notion database to retrieve its entries (pages) with optional filtering and sorting. Supports complex filter conditions using compound "and"/"or" filters as well as property-specific filters (text, number, date, checkbox, select, etc.). Results are paginated; use the cursor to fetch subsequent pages.

### Search

Search across all pages and databases shared with the integration by title. Returns matching pages and databases with their metadata. Best suited for finding resources by name rather than exhaustive enumeration.

### Update Block

Update an existing block's content or archive/delete it. The update fields depend on the block type. Can also be used to archive (soft-delete) a block by setting archived to true.

### Update Database

Update a Notion database's title, description, schema (properties), icon, or cover. Use this to add, rename, or remove properties from a database schema, or to change database metadata.

### Update Page

Update an existing Notion page's properties, icon, cover, lock status, or archive status. Use this for modifying page metadata and property values. To modify page content (blocks), use the block management tools instead.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
