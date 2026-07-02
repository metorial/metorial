# <img src="https://provider-logos.metorial-cdn.com/one-drive.svg" height="20"> Onenote

Create, read, update, and organize OneNote notebooks, sections, section groups, and pages. Create pages with rich HTML content including images, video, audio, and embedded files. Update page content using targeted patch operations. Copy notebooks, sections, and pages across user, group, and SharePoint site locations. Search notes with full-text search and OCR on images. Retrieve page previews and structured notebook hierarchies. Access personal, shared, group, and SharePoint site-hosted notebooks.

## Tools

### Copy Content

Copy a OneNote notebook, section, or page to another location. Supports copying across notebooks, section groups, users, groups, and SharePoint sites. The copy operation is asynchronous and returns an operation status.

### Create Notebook

Create a new OneNote notebook with the specified name. The notebook is created in the authenticated user's default OneDrive location.

### Create Page

Create a new OneNote page in a section. The page body is provided as HTML. You can include a title, text, images (via public URLs), and other supported HTML elements.

### Create Section Group

Create a new section group for organizing sections. Can be created directly in a notebook or nested inside another section group.

### Create Section

Create a new section inside a OneNote notebook or section group. Provide either a **notebookId** or a **sectionGroupId** to specify the parent container.

### Delete Page

Permanently delete a OneNote page. This action cannot be undone.

### Get Notebook

Retrieve details of a specific OneNote notebook by its ID, including creation date, sharing status, and modification metadata.

### Get Page

Retrieve a OneNote page's metadata and optionally its HTML content or a short text preview. Use **includeContent** to fetch the full HTML body, or **includePreview** for a text snippet (up to 300 characters).

### List Notebooks

List all OneNote notebooks accessible by the authenticated user. Supports filtering, sorting, and pagination via OData query parameters.

### List Pages

List all pages within a OneNote section. Returns page metadata including title, creation time, and ordering. Supports filtering, sorting, and pagination.

### List Section Groups

List all section groups within a OneNote notebook. Section groups provide an additional level of hierarchy for organizing sections.

### List Sections

List all sections within a OneNote notebook. Supports filtering, sorting, and pagination.

### Search Pages

Full-text search across all OneNote pages accessible by the authenticated user. Searches page titles and content, including OCR text from images.

### Update Page Content

Update the content of an existing OneNote page using PATCH operations. Supports appending, replacing, inserting, prepending, and deleting content on specific page elements identified by their element IDs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
