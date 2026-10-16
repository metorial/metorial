# NocoDB integration

## Connection

Configure the HTTP(S) URL of a Cloud or self-hosted NocoDB instance. Authentication uses the `xc-token` header with an API token from Account Settings → API Tokens. Tokens can have resource and permission restrictions and may expire; no token-refresh endpoint is assumed. Select permission categories matching your intended record, table, field, view, webhook, and project operations.

## Supported workflows

- Discover bases and tables, inspect base/source metadata, table schemas, individual fields, and available views.
- Create, read, update, and delete bases; create, inspect, update, and delete tables.
- List, read, create, update, delete, and count records. Bulk writes preserve the provider response, which may contain only record identifiers.
- List, add, and remove linked records through a relationship field.
- Create, update, and delete fields, including formulas, metadata, and provider column options.
- List, create, update, and delete table webhooks using the existing v2 URL-notification payload.

All original tool keys remain available. Record and linked-record pagination uses v2 offset/limit inputs and provider page information. Workspace-specific base discovery returns one provider page and its actual page metadata. Published continuation controls for this v2 route have not been established. New optional workspace/source selectors choose the corresponding v2 routes; omitting them retains the original route. The v3 record and filtering response formats are distinct and are not substituted for v2.

Complete provider metadata is returned alongside selected fields. Field creation attempts to read the original table column IDs, then resolves a unique new column matching the requested identity from the returned table. The pre-read is optional: unavailable or untrustworthy metadata does not block creation or require additional table-read permission. Without a trusted baseline, accepted creation preserves the response and recovery guidance without inferring a field ID. Updates resolve the requested column ID. Ambiguous accepted mutations return recovery guidance and the complete response, without presenting table metadata as field metadata. Numeric record IDs are forwarded unchanged, including external numeric primary keys. NocoDB's maintained column response model marks column title and UI type as optional; those properties are returned only when supplied. Boolean metadata preserves both true and false. The integration has no downloadable-file tool; attachment fields remain provider data within records.

One NocoDB product is represented; endpoint groups are not separate product categories. Administrative membership, scripts, and view creation are omitted because of scope and plan-specific availability. No suitable documented read-only identity endpoint accepting this API-token connection was established during the audit.

## References

- [Published v2 Data API](https://nocodb.com/apis/v2/data)
- [Published v2 Meta API](https://nocodb.com/apis/v2/meta)
- [REST API guide and v2/v3 distinctions](https://nocodb.com/docs/apis-and-mcp/rest-apis)
- [API token permissions and expiration](https://nocodb.com/docs/product/account-settings/api-tokens)
- [Official base route implementation](https://github.com/nocodb/nocodb/blob/develop/packages/nocodb/src/controllers/bases.controller.ts)
- [Official table route implementation](https://github.com/nocodb/nocodb/blob/develop/packages/nocodb/src/controllers/tables.controller.ts)
- [Official column route implementation](https://github.com/nocodb/nocodb/blob/develop/packages/nocodb/src/controllers/columns.controller.ts)
- [Official data route implementation](https://github.com/nocodb/nocodb/blob/develop/packages/nocodb/src/controllers/data-table.controller.ts)
- [Official webhook route implementation](https://github.com/nocodb/nocodb/blob/develop/packages/nocodb/src/controllers/hooks.controller.ts)

- [Official column response model](https://github.com/nocodb/nocodb/blob/develop/packages/nocodb-sdk/src/lib/Api.ts#L4754)
