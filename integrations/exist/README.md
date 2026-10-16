# Exist

Read personal analytics from Exist, discover supported attribute templates, create or acquire attributes, and update daily values. Retrieve correlations, insights, rolling averages, and the connected user profile.

## Authentication

OAuth2 supports reads and writes for the selected attribute-group scopes. Username and password authentication creates a read-only token; write and ownership operations require OAuth2. OAuth access and refresh tokens rotate on refresh.

## Workflows

- Use `get_attribute_templates` to discover template names, groups, and value types, then `create_attribute` or `manage_attribute_ownership` to prepare attributes for writing.
- Read the actual attribute `name` from successful create/acquire records before updating values. A generated name can differ from its label.
- Use `get_attributes` and `get_attribute_values` to read daily history. `get_attributes` with values supports up to 31 days per attribute; individual value history is paginated.
- Writes accept batches of up to 35 records. Inspect failures and successful records separately; a batch can partially succeed. Increment successes include the provider's current total.
- Use `get_correlations`, `get_insights`, and `get_averages` to explore patterns. Averages use the latest 60 days of data and are generated weekly. Correlations do not establish causation.

Values use metric units and dates local to the connected user. Read unit preferences and timezone through `get_user_profile`. Paginated tools return the count, page availability, and provider continuation URLs. Complete provider responses are available in `raw`.

The current attribute-values reference lists `date_max` but omits `date_min`; the existing `dateMin` input remains forwarded for compatibility, and its provider filtering behavior is unverified. Combining owned-only listing with included values is unsupported by the documented endpoints; list owned names first, then request their values.

See the [official API reference](https://developer.exist.io/reference/important_values/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
