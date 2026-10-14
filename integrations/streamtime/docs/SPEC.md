# Streamtime integration

This integration uses the Streamtime public v1 REST API at
`https://api.streamtime.net/v1`.

## Authentication

Use the API key available to the account subscriber under Settings > Integrations
> API. Requests send the key as a Bearer token. The integration does not require
an organisation ID at connection setup. `get_organisation` identifies the
connected organisation and can return branches and rate cards.

## Tools

- Jobs: create, retrieve, update, duplicate, search, and add comments.
- Job plans: create/update phases, items, and milestones; delete milestones;
  assign users and roles; create checklist sub-items.
- Job item discovery: `get_job_item` retrieves an item and optionally its user
  assignments, role assignments, and checklist sub-items. Call `get_job` with
  `includeItems` first to discover item IDs.
- Companies and contacts: create, retrieve, and update; retrieve a company's
  contacts and addresses.
- Time entries: create singly or in bulk, retrieve, update, and delete. Hours are
  converted to whole minutes. A job item must resolve to one user assignment;
  `get_job_item` with `includeUsers` exposes assignment IDs for `jobItemUserId`.
- Expenses: create, retrieve, and update, including purchase-order details.
  `amount` represents total cost at quantity 1; use `costRate` and `quantity`
  for unit pricing.
- Invoices: retrieve details, line items, tracked line items, and payments; update
  metadata; record payments; search.
- Quotes: retrieve details, line items, and tracked line items.
- Labels: list, create, search by entity class and IDs, and delete.
- Organisation, users, and roles: read organisation and team information.

## Search

`list_search_filters` returns filter selectors, sort columns, and related-data
options from `/search/setup`. Use search view 7 for jobs and 11 for invoices.
The `query` input on `search_jobs` and `search_invoices` accepts expressions using
these selectors. Pagination uses `limit` (0–1000) and zero-based `offset`.
An empty query requests an unfiltered page. Returned counts describe the current
page unless the API supplies a total count.

The existing `filterGroupCollections` input remains available for the older
numeric filter format described in the provider's help article. It cannot be
combined with `query`. The current OpenAPI document describes selector queries,
while also retaining legacy filter-group component schemas. Compatibility of
legacy filter searches with the current service has not been tested live.

## References

- [v1 OpenAPI definition](https://api.streamtime.net/v1/swagger.json)
- [Interactive API documentation](https://api.streamtime.net/v1/swagger)
- [API key and search guidance](https://help.streamtime.net/en/articles/12854233-using-the-streamtime-public-api)
