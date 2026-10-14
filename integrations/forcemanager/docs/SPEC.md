# ForceManager integration

ForceManager (Sage Sales Management) is a CRM for field sales teams. This integration uses the public v4 API at `https://api.forcemanager.com/api/v4`.

## Authentication

Both API Key and Session Key connections accept the public and private API keys. The keys are exchanged through `POST /login` with `username` and `password`. The returned `token` is sent as `X-Session-Key` on subsequent requests. Existing API Key connections with no stored token perform the exchange before their first request.

API keys are available to administrators under Settings > Integrations > API key management. The public v4 reference does not document a current-user or connection-account identity endpoint. User discovery is available through `get_user`, but a user list does not identify the authenticated principal.

## Capabilities

- Create, retrieve, search, update, and delete accounts, contacts, activities, opportunities, products, calendar entries, and sales orders.
- Create, retrieve, list, update, and delete sales-order lines. `get_sales_order` can include all lines of one order; `get_sales_order_line` supports paginated line discovery.
- Retrieve users and discover branches with stable IDs and localized names.
- Retrieve built-in lookup resources and discover custom value lists. Omit `resourceName` from `get_values` to list custom tables, then pass a table's `databaseName` to retrieve its values.
- Find an entity by its external ID using the entity's documented `extId` filter.

## Requests and pagination

Resource routes use `/accounts`, `/contacts`, `/activities`, `/opportunities`, `/products`, `/calendar`, `/salesorders`, and `/salesordersLines`. The documented sales-order-line creation path is `/salesOrdersLines`.

Advanced filters use the `where` query parameter. Existing tool `query` inputs are passed through as the filter expression, and individual search fields are combined with it. Pagination uses the zero-based `page` query parameter. The API documents an empty array as the end of pagination; continue requesting `nextPage` until it is null. `totalCount` is the number of records in the returned page, rather than a collection total.

Existing activity inputs map to v4 fields: `activityDateTime` to `date`, `activityTypeId` to `typeId`, `isCheckin` to `checkin`, and check-in coordinates to `latitude`/`longitude`. Calendar owner, type, task, and reminder inputs map to `salesRepId`, `typeId`, `task`, and `reminder`. Opportunity probabilities accept percentages in increments of 10 and map to the provider's integer scale from 0 to 10.

## Official reference

- [API reference](https://developer.forcemanager.com/)
- [OpenAPI document](https://developer.forcemanager.com/openapi.json)
