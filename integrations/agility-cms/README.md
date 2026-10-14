# <img src="logo.png" height="20"> Agility CMS

Manage and deliver structured content, pages, and media assets in a headless CMS. Fetch content items and lists, retrieve pages and sitemaps, and query content via GraphQL. Create, update, delete, publish, and unpublish content items and pages, including approval workflows. List, move, and delete media assets and organize folders. Define content models, inspect containers, users, locales, and content history, and sync content incrementally. Confirm the authenticated user and inspect queued write batches.

Content and page writes briefly wait for their batch to finish. If a write is still pending, it returns `success: false` and a `batchId`; use `get_batch_status` to check completion before retrying the write. Saving writes to staging; publishing is a separate operation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
