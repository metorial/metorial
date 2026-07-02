# <img src="https://provider-logos.metorial-cdn.com/contentful-logo.png" height="20"> Contentful

Manage structured content in a headless CMS. Create, update, publish, unpublish, archive, and delete entries and assets. Define content types and content models with field validations. Retrieve published content via the Content Delivery API or preview unpublished content via the Content Preview API. Manage spaces, environments, and environment aliases. Configure locales for multilingual content. Apply image transformations including resizing, cropping, and format conversion. Sync content incrementally using sync tokens. Organize content with tags. Group and bulk-publish content using releases. Schedule future publish and unpublish actions. Manage users, organizations, teams, and space memberships. Configure webhooks for content change notifications on entries, assets, content types, releases, and scheduled actions.

## Tools

### Create Asset

Create a new asset in Contentful. Provide file upload URL, title, and description per locale. Optionally process and publish the asset immediately.

### Create Entry

Create a new entry for a given content type. Provide fields as a locale-keyed object. Optionally publish the entry immediately after creation.

### Get Asset

Retrieve a single asset by ID. Returns full asset metadata including file URL, dimensions, and locale-specific fields.

### Get Entry

Retrieve a single entry by ID. Returns the full entry fields, metadata, and version information.

### List Content Types

List all content types in the current environment. Returns content type names, field definitions, and configuration details.

### List Environments

List all environments in the current space. Returns environment names, status, and metadata.

### List Locales

List all configured locales in the current environment. Returns locale codes, names, and fallback configuration.

### Manage Asset Lifecycle

Perform lifecycle actions on an asset: publish, unpublish, archive, unarchive, or delete. Fetches the current version automatically if not provided.

### Manage Content Type

Create, update, publish, unpublish, or delete a content type. When creating or updating, provide the full field definitions. Use the activate action to publish a content type so entries can be created from it.

### Manage Entry Lifecycle

Perform lifecycle actions on an entry: publish, unpublish, archive, unarchive, or delete. Fetches the current version automatically if not provided.

### Manage Release

Create, list, publish, unpublish, or delete releases. A release groups multiple entries and assets for bulk publishing.

### Manage Tags

List, create, update, or delete content tags in the current environment. Tags help organize and filter content.

### Schedule Action

Schedule a future publish or unpublish action for an entry. Also supports listing and cancelling scheduled actions.

### Search Assets

Search and filter assets in a Contentful space. Supports filtering by mime type, file name, and other query parameters. Returns asset metadata, file URLs, and dimensions.

### Search Entries

Search and filter entries in a Contentful space. Supports filtering by content type, field values, tags, creation/update dates, and full-text search. Returns paginated results with entry fields, metadata, and linked resources.

### Sync Content

Perform a content sync via the Content Delivery API. Use initial sync to fetch all content, or provide a sync token to retrieve incremental changes (deltas) since the last sync.

### Update Entry

Update an existing entry's fields. Fetches the current version automatically if not provided. Optionally publish the updated entry.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
