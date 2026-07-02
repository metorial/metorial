# <img src="https://provider-logos.metorial-cdn.com/canva.jpeg" height="20"> Canva

Create, manage, and export graphic designs programmatically. Upload and manage assets (images), organize designs and assets into folders, and retrieve design metadata. Import external files as Canva designs and export designs in various formats (PDF, PNG, JPG). Autofill brand templates with dynamic data to generate designs at scale. Read and create comments and replies on designs. Resize designs to different dimensions. Manage folder permissions and retrieve user profile information. Receive webhook notifications for comments, design sharing, approval requests, access requests, and suggestions.

## Tools

### List Brand Templates

List brand templates available to the user. Supports searching by query, filtering by ownership, and pagination. Requires the user to be a member of a Canva Enterprise organization.

### Export Design

Export a Canva design to a downloadable file. Supports PDF, JPG, PNG, GIF, PPTX, and MP4 formats. This starts an asynchronous export job. If the job completes immediately, download URLs are returned; otherwise use the job ID to poll for completion.

### Get User Profile

Retrieve the authenticated user's profile information including user ID, team ID, and display name.

### Import Design

Import an external file as a new Canva design from a URL. Supports various file formats including PDF, Adobe Creative Suite files (.ai, .psd), Microsoft Office documents, Apple productivity apps, and OpenOffice formats. This starts an asynchronous import job.

### Get Asset

Retrieve metadata for an asset (image or video) in the user's Canva library, including name, tags, timestamps, and thumbnail info.

### Create Comment

Create a new comment thread on a design, or reply to an existing comment thread. To create a top-level comment, provide a designId and message. To reply, also provide a threadId.

### List Designs

List and search designs in the user's Canva account. Supports filtering by search query, ownership, and sorting. Returns paginated results.

### Get Folder

Retrieve metadata for a specific folder in the user's Canva projects.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
