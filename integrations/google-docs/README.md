# <img src="https://provider-logos.metorial-cdn.com/google-docs.svg" height="20"> Google Docs

Create, read, edit, and format Google Docs documents. Insert and style text, manage tables, add images, create bulleted and numbered lists, and apply paragraph formatting. Use named ranges for template merging and dynamic content generation. Access document structure including headers, footers, and multiple tabs.

## Tools

### Create Document

Creates a new empty Google Docs document with the specified title. Returns the document ID which can be used to add content using other tools.

### Edit Document

Performs one or more editing operations on a Google Docs document. Supports inserting, deleting, and replacing text, formatting, inserting images, tables, page breaks, and creating bullet lists. Operations are executed in order.

### Get Document

Retrieves a Google Docs document by its ID. Returns the document metadata and optionally the full content as both structured JSON and plain text.

### List Documents

Lists Google Docs documents accessible to the user. Can filter by name, folder, or other criteria. Returns document metadata including IDs for use with other tools.

### Manage Named Ranges

Creates or deletes named ranges in a Google Docs document. Named ranges act as bookmarks that allow referencing specific sections of a document for targeted updates or template operations.

### Merge Template

Replaces placeholder text in a Google Docs document with dynamic values. Useful for mail merge, generating personalized documents from templates, or populating forms. Each placeholder is replaced with its corresponding value throughout the document.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
