# Productboard Integration Specification

## Current API availability

The [official April 9, 2026 announcement](https://developer.productboard.com/v1.0.0/changelog/2026-04-09) made API v2 generally available and set the API v1 sunset to **July 8, 2026**, after which v1 endpoints would no longer be available.

This package provides three current read tools:

- `list_entity_configurations`: `GET https://api.productboard.com/v2/entities/configurations`; discovers workspace entity types and their fields, filters, and validation rules.
- `list_entities`: `GET https://api.productboard.com/v2/entities`; lists entity records by type, name, archived state, or parent, with optional response field selection.
- `get_current_user`: `GET https://app.productboard.com/oauth2/token/info`; inspects the OAuth user, workspace, application, scopes, and remaining token lifetime. Requires an OAuth connection.

Entity results preserve the provider's current `id`, `type`, `fields`, and `links` structure. The entity tools accept a `pageCursor` and return the cursor extracted from `links.next` when another page is available. Call subsequent pages with the same filters. Page size is controlled by Productboard.

## Authentication

Both API tokens and OAuth connections authenticate entity reads using a Bearer token. OAuth authorization and refresh use the documented `app.productboard.com/oauth2` endpoints, with token exchange parameters in the query string. The OAuth method requests `entities:read`, which covers entity records and configurations; unused legacy v1 scopes are no longer requested. Existing OAuth connections may need to reconnect to grant this scope. No additional PII scope is requested, so entity PII can be redacted.

The identity endpoint is documented for active OAuth access tokens. API token connections are rejected locally by `get_current_user`. Legacy OAuth connections with stored refresh tokens remain eligible. OAuth refresh validates that a refresh token exists, validates returned token fields, and preserves the prior refresh token when the provider omits a replacement.

## Legacy API v1 operations

The following retained tool keys still call API v1 and are unavailable under the announced sunset. Their routes and input schemas are preserved in this bounded refresh; the package does not claim that these operations have been restored:

- `assign_feature_to_release`
- `create_company`
- `create_feature`
- `create_initiative`
- `create_key_result`
- `create_note`
- `create_objective`
- `create_release`
- `create_user`
- `delete_feature`
- `delete_initiative`
- `delete_key_result`
- `delete_note`
- `delete_objective`
- `delete_release`
- `delete_user`
- `get_custom_field_values`
- `get_feature`
- `get_initiative`
- `get_note`
- `get_objective`
- `list_companies`
- `list_custom_fields`
- `list_feature_statuses`
- `list_features`
- `list_initiatives`
- `list_key_results`
- `list_notes`
- `list_objectives`
- `list_product_hierarchy`
- `list_releases`
- `list_users`
- `set_custom_field_value`
- `update_company`
- `update_feature`
- `update_initiative`
- `update_key_result`
- `update_objective`
- `update_release`
- `update_user`

A separate migration is required for these operations. API v2 changes entity payloads, note attribution, write response shapes, and cascading delete behavior; changing URL paths alone cannot safely migrate them.

## Official sources

- [API v1 sunset announcement](https://developer.productboard.com/v1.0.0/changelog/2026-04-09)
- [Migration guide](https://developer.productboard.com/reference/migration-guide)
- [List entity configurations](https://developer.productboard.com/reference/listentityconfigurations)
- [List entities](https://developer.productboard.com/reference/listentities)
- [Pagination](https://developer.productboard.com/reference/pagination)
- [OAuth authorization, refresh, and token information](https://developer.productboard.com/reference/oauth-authorization-code)

## Verification limits

This refresh is grounded in official documentation and local build checks. Live provider requests, E2E tests, and model evals have not been run. It remains a partial refresh with a major provider migration limitation.
