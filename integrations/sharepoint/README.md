# <img src="https://provider-logos.metorial-cdn.com/sharepoint-icon.svg" height="20"> Sharepoint

Manage SharePoint sites, document libraries, lists, and files. Create, read, update, and delete lists and list items with custom columns. Upload, download, move, copy, and version files in document libraries. Search across sites, files, folders, lists, and list items using Microsoft Search. Manage permissions at site, list, and item levels with granular access control. Define and manage content types and site columns. Subscribe to webhooks for list and library change notifications. Retrieve site properties and search for sites across Microsoft 365.

## Authentication

When registering the OAuth app in Microsoft Entra ID for local CLI auth, use `http://localhost:45873/callback` as the redirect URI.

## Tools

### Get Content Types

Retrieve content types and site columns for a SharePoint site. Content types define reusable schemas for lists and libraries. Site columns are reusable field definitions that can be added to content types and lists.

### Get Drives

Retrieve document libraries (drives) for a SharePoint site. Can get the default drive, a specific drive by ID, or list all drives on a site. Drives are the containers for files in SharePoint.

### Get File Versions

Retrieve the version history of a file in a SharePoint document library. Returns all versions with their IDs, timestamps, and authors. Useful for auditing changes or rolling back to a previous version.

### Get Site

Retrieve detailed information about a SharePoint site. Look up a site by its ID, hostname and path, or get the root site. Also supports listing subsites of a given site.

### List Sites

Search for SharePoint sites by keyword, or list subsites of a given site. Returns a list of matching sites with their IDs and URLs.

### Manage Columns

List, create, update, or delete columns (fields) on a SharePoint list. Columns define the schema and metadata structure of a list. Supports various column types including text, number, boolean, dateTime, choice, currency, and personOrGroup.

### Manage File

Upload, download, move, copy, rename, or delete files and folders in a SharePoint document library. Also supports creating folders and listing folder contents. Use this for all file and folder operations within document libraries.

### Manage List Items

Full CRUD operations on SharePoint list items. Create, read, update, delete, or list items in a SharePoint list. Supports OData filtering and ordering when listing items. Field values match the list's column schema.

### Manage List

Create, read, update, or delete SharePoint lists within a site. Also supports listing all lists on a site. Lists are the foundation for data storage in SharePoint and can represent custom business data, contact lists, task trackers, and more.

### Manage Permissions

View, grant, and revoke permissions on SharePoint files and folders. Create sharing links, invite users with specific roles, list current permissions, or remove a permission. Works with drive items in document libraries.

### Search Drive

Search for files and folders within a specific SharePoint document library (drive). Uses the OneDrive search API scoped to a single drive. Returns matching items with their metadata.

### Search

Search across SharePoint content using the Microsoft Search API. Search for files, folders, lists, list items, or sites using KQL (Keyword Query Language) queries. Supports filtering by entity type and pagination.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
