# <img src="https://provider-logos.metorial-cdn.com/zeplin-logo.png" height="20"> Zeplin

Access Zeplin projects, screens, published screen-version design data, components, styleguides, design tokens, and flow boards. Manage project members, screen notes and replies, and project colors. Identify the current account and resolve or reopen screen-note discussions.

## Tools

### Get Current User

Identify the authenticated Zeplin account and retrieve its profile details.

### Get Screen Version

Retrieve published screen-version design data, including layers, assets, and commit information. Omit the version ID to retrieve the latest version.

### Update Screen Note

Resolve or reopen a note, or change its normalized position or color.

### Get Design Tokens

Retrieve all exported design tokens from a Zeplin project or styleguide, including colors, text styles, and spacing tokens in a structured format. Provide either a **projectId** or **styleguideId**.

### Get Project

Retrieve detailed information about a specific Zeplin project including its metadata, resource counts, linked styleguide, and workflow status.

### Get Screen

Retrieve detailed information about a specific screen in a Zeplin project, including its current section, variant, tags, and thumbnail. Use List Screen Versions for its version history.

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

List a page of screen notes and their comments. Screen annotations are a separate resource.

### Update Project

Update a Zeplin project's name or description.


### Get Component

Retrieve component metadata from a project or styleguide, including its thumbnail and section reference.

### Get Styleguide

Retrieve styleguide metadata and resource counts.

### Get Flow Board

Retrieve a flow board with all pages of its nodes and connectors.

### Invite Project Member

Invite a user by email, username, or user ID. The invitation API does not assign roles; omit the legacy role field.

### Remove Project Member

Remove a project member by their user ID.

### Create Screen Note

Create a note with initial comment text. Omitted position and color default to the screen center and yellow.

### Delete Screen Note

Delete a screen-note discussion.

### Add Note Comment

Reply to an existing screen note.

### Create Project Color

Create a named RGBA color in the project's local styleguide.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
