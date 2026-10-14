# Mural Integration

This package exposes Mural's public v1 canvas API. Official reference: https://developers.mural.co/public/reference/intro.

## Authentication

Connect with OAuth authorization code flow. Token exchange and refresh use form-encoded requests to `https://app.mural.co/api/public/v1/authorization/oauth2/token`; access tokens use Bearer authorization. Refresh responses retain the previous refresh token when no replacement is returned.

The enterprise API key connection is retained for existing configuration compatibility. Enterprise keys belong to Mural's separate Enterprise API and cannot authorize these public canvas tools; use OAuth for this package's operations.

## Capabilities

- Identity: retrieve the current user's profile.
- Workspaces and rooms: discover workspaces, retrieve workspace/room details, and create, update, or delete rooms.
- Murals: list, retrieve, create in a destination room, update titles, delete, and duplicate canvases.
- Widgets: list/retrieve widgets; create and update sticky notes, shapes, text boxes, titles, uploaded images, arrows, areas, and comments; delete widgets.
- Tags and templates: manage tags, list/create/delete templates, and create murals from templates.
- Membership: list mural collaborators, invite collaborators to a mural/room/workspace, and remove them from a mural/room. Provider recipient rejections are reported as errors.
- Facilitation: voting-session creation/results/listing, timer controls, and private mode.
- Search: paginated mural, room, and template searches within a workspace.

## Resource and payload rules

Call `list_workspaces` then `list_rooms` to obtain destination IDs. Mural and template-based mural creation require a numeric destination room ID; template-based creation also requires a title. Public room IDs remain strings in tool inputs/outputs and are converted to numbers in creation payloads. Provider millisecond creation/update timestamps are returned as ISO strings.

Sticky-note, shape, text-box, and title creation use the provider's array request/response contracts. Image creation requires a previously uploaded `assetName`, position, and dimensions; a source URL alone cannot create an image. Arrows require position, dimensions, and at least two path points; optional widget references connect their endpoints. Comments send text as the provider's `message` field.

Mural descriptions cannot be updated through this public API. Workspace invitations require `workspaces:write` and workspace-admin permissions. Role selection applies to mural invitations only.

Pagination uses provider `next` cursors, exposed as `nextToken`; reuse the same page limit when continuing. Search sends the query through the documented `q` parameter.

## Verification limits

The refresh is based on public provider documentation and a local package build. No authenticated provider calls, live E2E runs, evals, or trigger changes were performed. The existing `get_chat_history` tool is retained for compatibility; its endpoint is absent from the current public reference, so availability remains unverified.
