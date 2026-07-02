# <img src="https://provider-logos.metorial-cdn.com/prismic-logo.jpeg" height="20"> Prismic

Query, create, and manage structured content in a headless CMS repository. Read published content via REST or GraphQL APIs with filtering, sorting, pagination, and advanced predicates (full-text search, date ranges, geolocation). Manage content types and shared slices programmatically — create, read, update, and delete custom type schemas. Migrate content by creating and updating draft documents in a repository. Upload, update, and delete media assets (images, videos, documents) in the media library. Integrate third-party data sources via integration fields. Receive webhooks for document publish/unpublish events, release changes, and tag changes.

## Tools

### Get Document

Retrieve a single document by its ID or by its UID and type. Returns the full document with all field data.

### Get Repository Info

Retrieve metadata about the Prismic repository, including available content types, tags, languages, refs (versions), and bookmarks. Useful for discovering what content types and tags exist before querying documents.

### List Assets

List and search assets in the Prismic media library. Supports filtering by type, keyword, tags, and cursor-based pagination. Requires a Write API token.

### List Custom Types

List all custom types defined in the Prismic repository. Returns the schema and metadata for each type. Requires a Write API token.

### List Shared Slices

List all shared slices in the Prismic repository. Shared slices are reusable page sections that can be used across multiple custom types. Requires a Write API token.

### Create Migration Document

Create a new document via the Migration API. Documents are created as drafts in a migration release and must be published through the Prismic UI. Requires a Migration API token.

### Query Documents

Search and retrieve published documents from the Prismic repository using filters, predicates, and sorting. Supports filtering by document type, tags, full-text search, and custom predicates. Results are paginated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
