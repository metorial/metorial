# <img src="https://provider-logos.metorial-cdn.com/sanity.png" height="20"> Sanity

Query, create, update, and delete structured content documents in Sanity's Content Lake using GROQ or GraphQL. Manage digital assets including images and files with on-the-fly transformations. Perform document mutations (create, patch, delete) individually or in atomic transactions. Search content using vector embeddings for semantic similarity. Access document history and revisions at any point in time. Listen for real-time document changes. Manage datasets, projects, CORS origins, and API tokens. Control access with roles, permissions, and user membership. Export and import dataset content. Configure webhooks that fire on document or transaction changes with GROQ filtering and custom projections.

## Tools

### Get Document

Retrieve one or more documents by ID directly from the Content Lake. This endpoint bypasses caching and indexing to return the freshest version. Optionally retrieve a historical revision at a specific point in time.

### List Projects

List all Sanity projects you are a member of. Returns project metadata including name, ID, organization, members, and datasets. Optionally fetch detailed information for a specific project.

### Manage Datasets

List, create, or delete datasets in a Sanity project. Datasets are collections of JSON documents that hold your content. Each project can have multiple datasets (e.g., "production", "staging").

### Manage Webhooks

List, create, or delete GROQ-powered webhooks in a Sanity project. Webhooks fire HTTP requests when content in the Content Lake changes. Supports GROQ-based filtering and custom projections for webhook payloads.

### Mutate Documents

Create, update, patch, or delete documents in a Sanity dataset. Supports multiple mutations in a single atomic transaction. Each mutation in the array can be a create, createOrReplace, createIfNotExists, delete, or patch operation.

### Query Documents

Query documents from Sanity's Content Lake using GROQ (Graph-Relational Object Queries). Supports filtering, projections, ordering, slicing, and references across documents within a dataset. Use parameters to safely pass dynamic values into queries.

### Upload Asset

Upload an image or file asset to Sanity's Content Lake. Assets are stored alongside structured content and can be referenced from documents. Images support on-the-fly transformations (resizing, cropping, format conversion) via the CDN.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
