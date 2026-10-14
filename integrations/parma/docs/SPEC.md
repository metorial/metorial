# Parma Integration

Manage Parma relationship records and interaction notes using the official [API documentation](https://developers.parma.ai/api-docs/index.html) and [OpenAPI specification](https://developers.parma.ai/api-docs/v1/swagger.yaml).

## Authentication

OAuth uses `https://app.parma.ai/oauth/authorize` and `https://app.parma.ai/oauth/token`, requesting the documented `full` scope. API calls use Bearer tokens against `https://app.parma.ai/api/v1`. OAuth callbacks save the registered redirect URI for refresh requests. Existing connections without that value must reconnect before refreshing. Refresh responses retain the previous refresh token if a replacement is omitted.

## Tools

- `get_current_user`: retrieves the current user from the `data.user` response.
- `list_groups`: discovers group names and IDs required when creating relationships.
- `create_relationship`: creates a person or company with nonempty `groupIds`; optionally links a person through `companyId` and saves `notes` as background information in `about`.
- `search_relationships`: reads a provider page, with name (`query`), email, phone, and type filters.
- `get_relationship`: retrieves a relationship by ID, exposing contact details and linked company and group IDs.
- `add_note`: creates a note through `/notes`, sending `body`, `relationship_ids`, and an optional interaction `datetime`.
- `list_relationship_notes`: reads a provider page of relationship notes.

## Compatibility and limitations

Existing tool keys and field types remain available. The legacy relationship write fields `email`, `phone`, `company`, and `title` continue to be forwarded; the current OpenAPI request schema does not document them. Returned contact details reflect provider responses rather than echoing unconfirmed input. The legacy `perPage` parameter is forwarded, but the official API documents only `page`; custom page sizes are unverified.

Relationship and note responses use a `data` envelope. Contact email and phone values are read from `contact_details`. Relationship counts use provider `meta.count` when supplied.

No triggers are registered. Live provider behavior was not verified during this refresh.
