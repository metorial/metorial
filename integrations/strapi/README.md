# <img src="https://provider-logos.metorial-cdn.com/strapi.png" height="20"> Strapi

Create, read, update, and delete entries for custom content types via REST and GraphQL APIs. Manage media assets including images, videos, and documents. Publish and unpublish content with draft/publish workflows. Create and manage localized content for multiple locales using internationalization. Manage end users with registration, login, and role-based access control. Filter, sort, and populate nested relations and components in API queries. Configure webhooks to receive notifications on content, media, and release events.

## Tools

### Create Entry

Create a new entry in any Strapi content type. Pass field values as key-value pairs in the fields object. Supports setting locale and initial publication status.

### Delete Entry

Permanently delete an entry from any Strapi content type by its document ID. This removes both draft and published versions. For i18n content, a specific locale can be targeted.

### Delete Media

Permanently delete a file from the Strapi media library by its ID.

### Get Entry

Retrieve a single entry from any Strapi content type by its document ID. Supports field selection, relation population, locale, and draft/published status.

### Get Media File

Retrieve details of a specific media file from the Strapi media library by its ID. Returns file metadata including URL, dimensions, format, alternative text, and caption.

### Get Single Type

Retrieve a Strapi single type entry. Single types are content types with only one entry (e.g., homepage, site settings). Supports field selection, relation population, locale, and draft/published status.

### List Entries

Retrieve a paginated list of entries from any Strapi content type. Supports filtering by field values, sorting, field selection, relation population, locale, and draft/published status.

### List Media

List files from the Strapi media library. Returns uploaded images, videos, documents, and other files with their metadata including URLs, dimensions, and format info.

### Update Entry

Update an existing entry in any Strapi content type. Only the fields provided will be updated; other fields remain unchanged. Supports locale-specific updates.

### Update Media Info

Update the metadata of an existing file in the Strapi media library. Change the file name, alternative text, or caption without re-uploading the file.

### Update Single Type

Update a Strapi single type entry. Single types have only one entry (e.g., homepage, site settings). Only provided fields are updated.

### Upload Media

Upload a file to the Strapi media library from a URL. Optionally set alternative text, caption, and a custom name for the file.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
