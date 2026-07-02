# <img src="https://provider-logos.metorial-cdn.com/zeplin-logo.png" height="20"> Zeplin

Access and manage design projects, screens, components, and styleguides in Zeplin. Retrieve design specs, assets, code snippets, and design tokens. Create and manage notes and comments on screens. Publish screen versions with PNG/JPEG images. Manage design tokens including colors, text styles, and spacing tokens at project and styleguide levels. Access flow boards, variable collections, and connected components. Invite and remove project and styleguide members. Manage organization members and workspace settings. Receive webhooks for changes to projects, screens, components, notes, styleguides, and organization membership.

## Tools

### Get Design Tokens

Retrieve all exported design tokens from a Zeplin project or styleguide, including colors, text styles, and spacing tokens in a structured format. Provide either a **projectId** or **styleguideId**.

### Get Project

Retrieve detailed information about a specific Zeplin project including its metadata, resource counts, linked styleguide, and workflow status.

### Get Screen

Retrieve detailed information about a specific screen in a Zeplin project, including its versions, sections, and variants.

### List Colors

List all colors from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**. Supports pagination.

### List Components

List components from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId** to specify the source. Supports pagination.

### List Flow Boards

List all flow boards in a Zeplin project. Flow boards represent user journey maps or navigation diagrams. Supports pagination.

### List Organizations

List all Zeplin organizations (workspaces) that the authenticated user is a member of. Returns organization names, IDs, and logos.

### List Projects

List all Zeplin projects the authenticated user is a member of. Returns project metadata including name, platform, status, and resource counts. Supports pagination.

### List Screen Versions

List all versions of a specific screen in a Zeplin project. Screen versions represent the history of published design updates. Supports pagination.

### List Screens

List all screens in a Zeplin project. Returns screen metadata including name, thumbnail, and timestamps. Supports pagination.

### List Spacing Tokens

List all spacing tokens from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**. Returns spacing definitions used in the design system.

### List Styleguides

List all Zeplin styleguides the authenticated user is a member of. Optionally filter by linked project, linked styleguide, or workspace. Supports pagination.

### List Text Styles

List all text styles from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**. Returns typography definitions including font family, size, weight, and other properties.

### List Project Members

List all members of a Zeplin project, including their roles and profile information. Supports pagination.

### List Screen Notes

List all notes (annotations and comments) on a specific screen in a Zeplin project. Supports pagination.

### Update Project

Update a Zeplin project's name or description.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
