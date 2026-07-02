# <img src="https://provider-logos.metorial-cdn.com/figma.svg" height="20"> Figma

Access and inspect Figma design files, including full node trees, layers, properties, and metadata. Export file nodes as PNG, SVG, JPG, or PDF images. Read, create, and delete comments and reactions on files. Manage file version history. List team projects and project files. Retrieve published components, component sets, and styles from team libraries. Create, update, and delete variables and variable collections (Enterprise). Manage dev resources attached to file nodes. Retrieve library analytics and design system usage data (Enterprise). Read organization activity logs and discovery text events (Enterprise). Configure webhooks to receive notifications for file updates, deletions, version changes, comments, library publishes, and dev mode status changes.

## Tools

### Export Images

Render specific nodes from a Figma file as images. Returns download URLs for each requested node in PNG, SVG, JPG, or PDF format. URLs expire after 14 days.

### Get Components

Retrieve published components from a Figma team or file. Returns component metadata including name, description, key, thumbnail, and containing frame. Use team-level for browsing the design system, or file-level for a specific file's components.

### Get File Versions

Retrieve the version history of a Figma file. Each version includes a label, description, timestamp, and the user who created it. Supports pagination.

### Get File

Retrieve a Figma file's structure, layers, and metadata. Returns the full JSON tree of nodes with properties like dimensions, colors, text, and effects. Optionally request specific nodes by ID or limit traversal depth.

### Get Image Fills

Retrieve download URLs for all images used as fills in a Figma file. This returns URLs for user-uploaded images, not rendered node exports. URLs expire after 14 days.

### Get Styles

Retrieve published styles from a Figma team or file. Returns style metadata including name, description, type (FILL, TEXT, EFFECT, GRID), and thumbnail.

### Get Current User

Retrieve the currently authenticated Figma user's profile, including name, email, and avatar.

### List Team Projects

List all projects within a Figma team. Returns project names and IDs that can be used to browse files within each project.

### List Comments

Retrieve all comments on a Figma file, including replies and resolution status.

### Get Dev Resources

Retrieve developer resources attached to nodes in a Figma file. Dev resources are URLs shown in Dev Mode that link to code, documentation, or other developer resources.

### Get Variables

Retrieve variables and variable collections from a Figma file. Variables store reusable values for design properties like colors, spacing, and typography. Supports both local (all variables) and published (library-shared) variables. Enterprise plans only.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
