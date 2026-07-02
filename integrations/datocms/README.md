# <img src="https://provider-logos.metorial-cdn.com/datocms.png" height="20"> Datocms

Create, update, publish, unpublish, and delete structured content records in a headless CMS. Manage content models, fields, and schemas programmatically. Upload, organize, and deliver media assets with optimization and tagging. Query content via a GraphQL Content Delivery API with support for drafts, localization, and real-time updates. Manage sandbox and primary environments, fork and promote environments for safe migrations. Configure build triggers to deploy to hosting providers like Vercel and Netlify. Manage roles, API tokens, collaborators, and permissions. Search published website content via built-in site search. Receive webhook notifications for record, model, upload, deployment, and environment events.

## Tools

### Create Record

Create a new content record for a given model. Provide field values matching the model's schema. Localized fields should use an object with locale keys (e.g. \

### Delete Record

Permanently delete a content record by its ID. This action cannot be undone.

### Get Record

Retrieve a single content record by its ID, including all field values and metadata.

### Get Site Info

Retrieve project site information including name, domain, locales, timezone, global SEO settings, and other configuration details.

### List Models

List all content models (item types) defined in the project. Returns model names, API keys, field configuration, and settings like draft mode and localization.

### List Records

List and search content records in a DatoCMS project. Filter by model type, text query, or specific record IDs. Supports pagination and sorting.

### List Uploads

List media assets (uploads) in the project. Supports filtering by type and text search, with pagination.

### Manage Build Trigger

List, create, update, delete, or fire build triggers. Build triggers connect to hosting providers (Vercel, Netlify, etc.) to automatically deploy when content changes. Use the "trigger" action to manually start a deployment.

### Manage Environment

List, fork, promote, or delete sandbox environments. Environments allow safe schema migrations and testing before going live. Forking creates a full copy of an existing environment.

### Manage Field

Create, update, or delete fields on a content model. Fields define the structure and types of data that records can hold. Supported types include string, text, integer, float, boolean, date, date_time, json, file, gallery, link, links, rich_text, structured_text, slug, seo, color, lat_lon, video, and more.

### Manage Model

Get, create, update, or delete a content model (item type). Models define the structure of content records. Use this to inspect a model's configuration or modify the content schema.

### Manage Upload

Get, update, or delete a media asset (upload). Use this to inspect upload details, update metadata (tags, copyright, alt text), or remove an asset.

### Publish or Unpublish Record

Publish or unpublish a content record. Publishing makes the record available via the Content Delivery API. Unpublishing reverts it to draft status.

### Search Site

Search the published website using DatoCMS built-in site search. Returns matching pages with titles, URLs, body excerpts, and relevance scores. Requires site search to be configured with a build trigger.

### Update Record

Update an existing content record's field values. Only provide the fields you want to change; omitted fields remain untouched. For localized fields, you must provide all locale values (not just the changed ones).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
