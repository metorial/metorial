# NocoDB

Query and count records, create and update rows in bulk, manage linked records, and inspect bases, tables, fields, and views. Create, update, and delete bases and tables, manage field definitions, and configure table webhooks.

Connect with an instance URL and an API token from **Account Settings → API Tokens**. Grant the token the permission categories required by the tools you plan to use. Fine-grained token availability, expiration, and API permissions depend on the deployment and plan.

Start with `list_bases`, then `list_tables` and `get_table` to discover resource IDs and column definitions. `get_base` includes the provider's data source metadata. `list_bases` supports an optional workspace ID and returns one provider page for that workspace with its actual page metadata; published continuation controls for this v2 route have not been established. `list_tables` and `create_table` support an optional data source ID. Omitted identifiers retain the instance-wide/default-source v2 routes. Field creation optionally reads the table schema to distinguish the new column from existing columns. If that read is unavailable, creation still proceeds using the field-write permission. If accepted field creation or update cannot be resolved uniquely from the response, the result preserves the complete provider response and recovery guidance.

This integration uses the published NocoDB v2 APIs. Record lists and linked-record lists return one page; continue with the returned pagination metadata and an offset. Use `link_records` for relationship changes rather than writing relationship fields through record creation. View and collaboration API availability depends on the deployment and plan.

Provider references: [v2 Data API](https://nocodb.com/apis/v2/data), [v2 Meta API](https://nocodb.com/apis/v2/meta), [API tokens](https://nocodb.com/docs/product/account-settings/api-tokens), and [REST API guide](https://nocodb.com/docs/apis-and-mcp/rest-apis).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
