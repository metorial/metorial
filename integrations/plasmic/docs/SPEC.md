# Plasmic Specification

## Authentication

Project APIs authenticate with `x-plasmic-api-project-tokens: PROJECT_ID:TOKEN`. The public token is available in the project's Code panel; the secret token required for project writes is limited to enterprise customers.

CMS APIs authenticate with `x-plasmic-api-cms-tokens: CMS_ID:TOKEN`. The CMS Settings tab provides the database ID, public token, and secret token. Public tokens support published reads; secret tokens enable writes and draft reads. Project and CMS credentials can be connected independently, and write operations do not require a separate public token. Credentials must include a matching resource ID and at least one token.

These are resource-scoped credentials. No user-profile endpoint suitable for these credentials is documented in the public APIs covered here.

## Tools

- `list_cms_models`: Retrieve the connected database's model identifiers, names, and field schemas. Pass each model's `identifier`, rather than its internal table ID, as `modelId` in content tools.
- `get_cms_item`: Retrieve the first entry matching a field filter, or null. Prefer a unique field such as a slug. `_id` targets the system row ID only when the model has no user-defined `_id` field.
- `query_cms_items` and `count_cms_items`: Read model content or count matches. Filters use Plasmic's JSON `where` syntax. Query `order` accepts a field identifier, with optional `orderDirection` (`asc` or `desc`). Draft reads require a secret token.
- `create_cms_item` and `create_cms_items`: Create one entry or a batch using field values and optional human-readable identifiers. The provider receives a `rows` array; returned entries include row IDs. `publish` optionally publishes the created entries immediately.
- `update_cms_item`, `delete_cms_item`, and `publish_cms_item`: Mutate an entry at `/cms/rows/{rowId}`. Existing `modelId` inputs remain available for compatibility, but the provider addresses the entry by row ID. Updates accept optional identifiers and can publish immediately.
- `render_component`: Return the `html` string from the Render API's JSON response. Supports preview, published, and versioned requests, props, variants, and hydration. Versioned requests require a version; `maxAge` requires `prepass`. Custom application code components are unavailable in server rendering.
- `get_project_model`: Read the project's model. The Model API is experimental and may change.
- `update_project`: Upsert component bodies and design tokens through the enterprise Write API. Component `uuid` maps to `byUuid`, `tplTree` maps to the provider's `body`, and `components` maps to `updateComponents`. An explicit UUID is authoritative: only that UUID and the body are sent for its update, without competing name/path selectors. `tplTree` uses Write API element objects, such as `{ "type": "text", "value": "Hello" }`, rather than Model API TplNodes. A path defines a page when creating/upserting without a UUID. Token types use Color, Spacing, Opacity, LineHeight, FontFamily, FontSize, or BoxShadow; lowercase names with hyphens are normalized.

## Provider references

- [CMS API reference](https://docs.plasmic.app/learn/plasmic-cms-api-reference/)
- [Render API](https://docs.plasmic.app/learn/render-api/)
- [Model API](https://docs.plasmic.app/learn/model-quickstart/)
- [Write API](https://docs.plasmic.app/learn/write-api/)
- [Official CMS SDK source](https://github.com/plasmicapp/plasmic/blob/master/plasmicpkgs/plasmic-cms/src/api.ts), including ordering and model discovery
- [Official loader source](https://github.com/plasmicapp/plasmic/blob/master/platform/wab/src/wab/server/routes/loader.ts), including versioned rendering/model routes
