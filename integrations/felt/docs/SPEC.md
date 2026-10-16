# Felt Integration

Felt provides collaborative maps, geographic layers, annotations, projects, and external data sources. The integration uses the current REST API at `https://felt.com/api/v2`.

## Authentication

Use a workspace-scoped API token from Workspace Settings → Developers. Every request uses `Authorization: Bearer <token>`. Felt documents REST API access for Enterprise customers. The current-user endpoint validates the connection and supplies the profile. API-token authentication has no OAuth refresh flow.

## Tools

- Maps: `create_map`, `get_map`, `update_map`, `delete_map`, `move_map`, `duplicate_map`.
- Layers: `list_layers`, `manage_layer`, `import_layer`, `export_layer`.
- Annotations: `list_elements`, `manage_elements`. Ungrouped features and each group's features are returned separately.
- Comments: `manage_comments` exports JSON, CSV, or GeoJSON, resolves threads, and deletes comments.
- Projects: `list_projects`, `get_project`, `manage_project`. Project lookup returns maps and their stable IDs.
- Sources: `list_sources`, `get_source`, `manage_source`. After creating, updating, or syncing a source, poll `get_source` until `syncStatus` is `completed` or `failed`.
- Identity and embeds: `get_current_user`, `create_embed_token`. Embed tokens last 12 hours; mint one for every page load and associate it with a workspace member's email.

## Behavior and compatibility

Existing tool keys, input/output field types, optional fields, and enum values are preserved. Layer ordering is accepted as a numeric string and sent to Felt as an integer; layer list ordering and source list timestamps retain their existing string output types. The source detail tool additionally exposes the provider's numeric sync timestamp without conversion.

Map movement requires exactly one project or folder destination. Deletions are separate from updates. Project deletion removes all contained maps and folders. Source deletion leaves its layers in place, but stops their refreshes. Multi-operation layer updates run sequentially and can partially apply before a later request fails.

Layer exports and comment exports provide downloadable files. Existing `downloadUrl` and `comments` output fields remain available. Layer export links are regenerated for later downloads because Felt does not publish their lifetime.

## Limits

Felt's upload endpoint requires a display name. The existing optional `import_layer.name` contract remains optional for compatibility; provide it to satisfy Felt. Public URL imports are supported. File upload and file-backed refresh completion are outside the current tool surface; a refresh response requiring a replacement upload produces an actionable error.

Source creation, updates, and sync are asynchronous. An accepted request is not proof of successful ingestion. Felt limits POST payloads to 1 MB, and may simplify complex annotation geometry.

Layer and annotation group mutation, source credential administration, custom export jobs, and webhook delivery are not exposed by this integration.

## Official references

- [Getting started](https://developers.felt.com/rest-api/getting-started)
- [Maps](https://developers.felt.com/rest-api/api-reference/maps)
- [Layers](https://developers.felt.com/rest-api/api-reference/layers)
- [Layer uploads](https://developers.felt.com/rest-api/api-reference/layers/layer-uploads)
- [Layer exports](https://developers.felt.com/rest-api/api-reference/layers/layer-exports)
- [Elements](https://developers.felt.com/rest-api/api-reference/elements)
- [Comments](https://developers.felt.com/rest-api/api-reference/comments)
- [Projects](https://developers.felt.com/rest-api/api-reference/projects)
- [Sources](https://developers.felt.com/rest-api/api-reference/sources)
- [Users](https://developers.felt.com/rest-api/api-reference/users)
- [Embed tokens](https://developers.felt.com/rest-api/api-reference/embed-tokens)
