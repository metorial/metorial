# <img src="https://provider-logos.metorial-cdn.com/adobe.svg" height="20"> Adobe Creative Cloud

Manage Creative Cloud Libraries and elements, edit PSD files, remove backgrounds, generate and expand images with Firefly, browse Lightroom catalogs, apply Lightroom edits, search and license Adobe Stock assets, manage enterprise users, and submit InDesign data merge jobs.

## Authentication

Choose personal OAuth, enterprise OAuth, or server-to-server client credentials. API access depends on the APIs and scopes enabled in the Adobe Developer Console project. The current-user tool requires user OAuth. Existing connections without a refresh token need to reconnect with offline access.

## Tools

### Get Current User

Retrieve the Adobe identity associated with a user OAuth connection.

### Get Library

Retrieve complete library metadata using an ID discovered with List Libraries.

### Get Library Element

Retrieve complete element metadata, including representations and renditions.

### Get Stock Asset

Retrieve metadata for a content ID discovered with Search Stock.


### Apply Lightroom Edits

Apply Lightroom presets, auto-tone, or custom develop settings to an image via the Lightroom Image Editing API (Firefly Services). Input and output files must be hosted on supported cloud storage. The operation is asynchronous.

### Check Job Status

Check the status of an asynchronous Photoshop, Lightroom, or InDesign API job by polling its status URL. Returns the current job status, any output URLs, and error information if the job failed.

### Edit PSD

Perform programmatic edits on PSD files including layer manipulation, text layer editing, smart object replacement, applying Photoshop actions, and creating renditions. Supports multiple operation types in a single call. All operations are asynchronous — poll the returned status URL for results.

### Generate Image

Generate images from text prompts using Adobe Firefly AI. Supports customizing image dimensions, content class, style presets, and number of variations. Returns generated image URLs. This is a synchronous API — results are returned directly in the response.

### Generative Expand

Expand an image beyond its original boundaries using Adobe Firefly AI. Specify the target size and optional placement insets to control how the image is expanded. Optionally provide a text prompt to guide the generated content in the expanded areas.

### Generative Fill

Fill a masked area of an image with AI-generated content using Adobe Firefly. Provide an input image, a mask image (white areas are filled), and an optional text prompt to guide the generation. Returns the filled image URLs.

### InDesign Data Merge

Merge data into an InDesign template and export as PDF, JPEG, PNG, or InDesign document. Automate generation of catalogs, marketing materials, and personalized documents by combining an InDesign template with a data source file.

### License Stock Asset

License an Adobe Stock asset for use. Retrieves the license info and initiates licensing. Also can check the current license status of an asset before licensing.

### List Libraries

Browse and retrieve Creative Cloud Libraries for the authenticated user. Returns library names, IDs, metadata, and element counts. Use this to discover available libraries before accessing their contents.

### List Library Elements

Retrieve elements (colors, character styles, logos, images, graphics) from a specific Creative Cloud Library. Returns element types, names, thumbnails, and metadata.

### Manage Library

Create or delete a Creative Cloud Library. Creating a library makes it available across all Adobe applications. Deleting a library permanently removes it and all its elements.

### Manage Lightroom Catalog

Access a user's Lightroom cloud catalog and browse assets or albums. Retrieve catalog info, list photos/videos, list albums, or get album contents. Use this as the starting point for any Lightroom content operations.

### Manage Users

Manage Adobe user accounts within an organization. List users, get user details, create new users, remove users, and manage product profile assignments. Requires System Admin role.

### Remove Background

Remove the background from an image using Adobe Photoshop AI. Accepts images from cloud storage (S3 pre-signed URLs, Azure Blob Storage, or Dropbox) and outputs the result to cloud storage. The operation is asynchronous — a job ID and status URL are returned.

### Search Stock

Search Adobe Stock for images, videos, vectors, templates, and other creative assets. Filter by content type, orientation, and other criteria. Returns thumbnails, metadata, and licensing information.

## API compatibility

Job submission and completion are separate steps. Use Check Job Status with the returned Adobe status URL. Some submission responses provide a status URL without a status value; the tool preserves that distinction. Completed Photoshop renditions, Firefly images, and licensed Stock assets are available for download while Adobe or the storage provider retains them.

The existing InDesign data-merge route and inline Lightroom preset input remain available for compatibility. Adobe's current documentation uses a different InDesign v3 request and references Lightroom preset files in cloud storage; those newer formats are not implemented here. Provider entitlements and legacy-route availability require verification with a permitted account.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
