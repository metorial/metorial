# Sidetracker Integration

Sidetracker is a cookie-free marketing analytics product at [sidetracker.io](https://sidetracker.io/). It tracks visitor sessions, conversion lists, revenue attribution, and sales progress across domains.

## Authentication

Connect with an API key from the API section in account settings. Requests use the supplied value in the `Authorization` header and the base URL `https://app.sidetracker.io/api/`.

The [quick start](https://sidetracker.io/api-quick-start/) shows `Authorization: {API_KEY}`. The current [API reference](https://app.sidetracker.io/api/schema/redoc) instead describes a `Token` prefix. Existing connection values are passed unchanged; include the prefix in the supplied value if required by your account.

## Available workflows

- Inspect the connected account with `get_current_user`.
- Discover conversion lists with `get_lists`, retrieve one with `get_list`, create a preset-based list with `create_list`, and delete a list with `delete_list`.
- Retrieve paginated list rows with `get_list_rows`, inspect one with `get_list_row`, and add, update, or delete rows with `manage_list_row`.
- Retrieve sessions by domain with `get_sessions`. Use `get_session` to inspect a session, optionally including notes or a selected page of visits.
- Search converted sessions with `get_conversions`, including revenue status, tags, referrer labels, date range, incremental update timestamps, and attribution options. The provider ignores malformed filters, so a typo can broaden the results.
- Enrich sessions with `update_session_metadata`, `add_session_note`, `add_revenue`, and `update_sales_status`.
- Fire a configured call-to-action using `execute_trigger`.

List creation uses the provider's `tracking` or `checks` preset. Column names are case-sensitive and must belong to the selected preset. List, row, and session reads preserve the provider data supported by their existing tool contracts. New list-detail, row-detail, and conversion reads expose the unmodified provider response because the public reference does not specify response fields. Account lookup exposes only supported flat identity fields actually returned by the provider: id, name, username, email, first_name, and last_name. These fields are optional; the public reference does not guarantee their presence. Unknown and nested account data are omitted.

## Pagination and scope

List, list-row, session, and session-visit requests support the documented `page` and `page_size` parameters. Existing pagination fields remain optional numbers. Omitted fields keep the provider's defaults. No workspace or domain ID is required when connecting; domain-specific session reads accept the domain ID per call.

## Reference limitations

The public [OpenAPI schema](https://app.sidetracker.io/api/schema) omits response body definitions for most reads and mutations. It does not provide a domain-discovery endpoint. The `get_lists` public contract requires string identifiers, names, descriptions, and presets; malformed or incomplete entries or pagination envelopes produce a clear error rather than invented values. Existing generic mutation results and legacy Zapier request bodies are retained.

The reference includes webhook receiver and subscription routes, but callback contracts are outside these tools. No webhook registration or incoming-event workflow is configured by this integration.

## Official sources

- [API quick start](https://sidetracker.io/api-quick-start/)
- [API reference](https://app.sidetracker.io/api/schema/redoc)
- [OpenAPI schema](https://app.sidetracker.io/api/schema)
- [Official Postman collection](https://sidetracker.io/wp-content/uploads/2024/02/SideTracker-V1.postman_collection.json_.zip)
