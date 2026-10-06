# Softr

Manage native Softr databases, tables, fields and records, discover table views, and request app-user creation, deletion, synchronization, activation or deactivation. Existing tool keys and inputs remain supported. Deactivation retains the user record; app-user acknowledgements do not independently confirm resulting state.

Connect using a scoped Personal Access Token from workspace API tokens. Select read/write permissions for the required resources and reconnect when the token expires. User operations also require the exact published app hostname. Existing saved domain settings remain supported; database tools do not require an app domain. The API does not document current-user identity, workspace discovery for an empty workspace, token refresh or user-state readback.

Use `list_databases`, then `list_tables` to discover exact IDs and field definitions. Record list/search operations return native offset, limit and total with continuation metadata; search translates the retained field/value filters to native conditions and sends `sorting`. The detailed database/table/view list contracts have no paging parameters; their local safety bound is 1,000 entries, not a claim about a provider cap.

Database/table deletes default to non-forced deletion. Explicit `force:true` permits removal of contained data. Deletion requires a 204 acknowledgement, exact native absence and accessible parent/inventory proof. Field deletion and type changes can affect stored values. None of these operations promises erasure of audit/history or reversal of automation.

`get_records` can optionally produce a JSON download of the returned single record or page, within 8 MiB and 200 records per page. Existing response fields remain available. This is a local representation of native data, not a provider export job or attachment-field download. No signed file URL renewal is invented.

Magic sign-in links are sensitive and grant login; share them only with the intended user. JWT validation uses the selected published app host without forwarding the Personal Access Token, requires explicit native validation state and never invents identity from decoded claims. User synchronization is accepted work, not confirmed completion; omit emails deliberately for all users, never pass an empty array.

Current field writes document only name, type and options. Retained description, required, allowMultipleEntries and defaultValue inputs fail with guidance when supplied, rather than being silently ignored. Missing optional provider timestamps/counts remain absent instead of being fabricated.

Official references: [API setup and user endpoints](https://docs.softr.io/softr-api/api-setup-and-endpoints), [Database API](https://docs.softr.io/softr-api/softr-database-api/index.md), [native OpenAPI](https://docs.softr.io/openapi.yaml).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
