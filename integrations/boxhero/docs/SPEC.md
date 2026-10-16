# BoxHero API specification

BoxHero manages inventory for the team bound to an API token. Requests use `Authorization: Bearer <token>` and the base URL `https://rest.boxhero-app.com/v1`. Issue a token in Settings > Integrations; no OAuth or refresh token is used. `get_team` confirms the authorized team and operating mode. Items, locations, and transactions require Location mode (`2`); Basic (`0`) and Unit (`1`) teams receive a provider error for those resources.

## Tools

| Tool | Documented API behavior |
| --- | --- |
| `get_team` | `GET /teams/linked`; team ID, name, mode, and original currency metadata. |
| `list_items` | `GET /items`; item/location filters, 1–100 records per page, stock totals and per-location breakdowns. |
| `get_item` | `GET /items/{id}`; one item and optional location-scoped stock quantities. |
| `manage_item` | `POST /items`, `PUT /items/{id}`, `DELETE /items/{id}`; create, patch, or delete item metadata. |
| `list_attributes` | `GET /item-attrs`; maps `attr_name` and `attr_type`, includes attribute rank. |
| `list_locations` | `GET /locations`; every active location, stock quantity, and memo. |
| `list_partners` | `GET /partners`; paginated supplier/customer discovery, optional type 0/1, contact details. |
| `list_transactions` | `GET /transactions` followed by `GET /transactions/{id}` per result to preserve full line-item output. |
| `get_transaction` | `GET /transactions/{id}`; full line items and optional historical revision. |
| `create_transaction` | `POST /transactions` returns an ID; a detail read supplies the full required output. |
| `manage_transaction` | `PUT /transactions/{id}` and `DELETE /transactions/{id}`; partial updates/deletes with optional optimistic-concurrency revision. |

## Stock rules

Stock In and Move Stock use positive quantities. Stock Out uses negative quantities. Adjust Stock applies a signed relative change, not an absolute stock target. Each item may appear only once per transaction. `to_location_id` identifies the stock location for in/out/adjust and the destination for move. The existing `fromLocationId` input is also accepted as a Stock Out location and translated to `to_location_id`. Move Stock requires two distinct locations. A single active location can be selected automatically by the provider for other transaction types.

`partner_id` applies only to Stock In/Out. `transactionTime` maps to `tx_time`, cannot be in the future, and is unavailable for Adjust Stock. Memos accept up to 2,000 characters. Transaction updates can replace all line items; use the latest revision from `get_transaction` to reject concurrent edits. Delete returns an error for a missing or already deleted transaction.

Item creation can seed nonzero initial stock using `quantity` plus `locationId`; this happens after metadata creation. A stock-seeding failure can leave the item present, so inspect the error and existing items before retrying. Metadata updates do not alter stock. Attribute values use the documented array of `{id, value}` entries; update accepts null to remove a value. Deleting an item removes it from bundles while transaction history retains snapshots.

## Pagination and errors

Provider cursors are numeric or null. Existing public cursor fields remain strings: real numeric values are converted to strings, and null is omitted. Original responses preserve provider fields, numeric cursors, nulls, nested item references, and stock-level metadata. Required malformed response data raises a service error instead of reporting invented IDs, state, stock, or timestamps.

The team limit is 5 requests/second and 300 requests/minute across all tokens. Detail reads are paced within an invocation. A transaction list with N results uses N+1 HTTP requests, so smaller page sizes finish sooner. Detail hydration reads the latest state and is not an atomic snapshot. Creation followed by detail lookup is also nontransactional: a failed lookup reports the created ID and instructs callers to retrieve it rather than repeat creation.

HTTP failures retain the provider status, machine-readable code/type, title, field-level messages, and correlation identifiers. There are no file download/export tools or triggers in this integration.

## Official references

- [Authentication](https://www.boxhero.io/docs/developers/api/authentication)
- [Pagination](https://www.boxhero.io/docs/developers/api/pagination)
- [Errors](https://www.boxhero.io/docs/developers/api/errors)
- [List items](https://www.boxhero.io/docs/developers/api/reference/items/list-items)
- [Create item](https://www.boxhero.io/docs/developers/api/reference/items/create-item), [get item](https://www.boxhero.io/docs/developers/api/reference/items/get-item), [update item](https://www.boxhero.io/docs/developers/api/reference/items/update-item), [delete item](https://www.boxhero.io/docs/developers/api/reference/items/delete-item)
- [Attribute specifications](https://www.boxhero.io/docs/developers/api/reference/item-attrs/list-item-attrs)
- [Locations](https://www.boxhero.io/docs/developers/api/reference/locations/list-locations)
- [Partners](https://www.boxhero.io/docs/developers/api/reference/partners/list-partners)
- [Linked team](https://www.boxhero.io/docs/developers/api/reference/teams/get-linked-team)
- [List transactions](https://www.boxhero.io/docs/developers/api/reference/transactions/list-transactions), [create transaction](https://www.boxhero.io/docs/developers/api/reference/transactions/create-transaction), [get transaction](https://www.boxhero.io/docs/developers/api/reference/transactions/get-transaction), [update transaction](https://www.boxhero.io/docs/developers/api/reference/transactions/update-transaction), [delete transaction](https://www.boxhero.io/docs/developers/api/reference/transactions/delete-transaction)
