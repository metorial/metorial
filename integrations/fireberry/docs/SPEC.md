# Fireberry Integration

Fireberry provides a customizable CRM for sales, marketing, and service, with standard and custom object types.

## Authentication

Use the personal API Access Token (TokenID) under Profile > Account Security > API Access Token. Record and query requests send this token in the `tokenid` header to `https://api.fireberry.com/api`. Metadata requests include the same token as the `tokenid` query parameter required by `https://api.fireberry.com/metadata`. Access follows the user's Fireberry permissions.

## Supported tools

- Record CRUD: `create_record`, `get_record`, `update_record`, and `delete_record` work with standard and custom object system names or object numbers expressed as strings.
- Record discovery: `list_records` and `get_related_records` support pages of up to 50 records and page numbers up to 10. Related record system names are resolved through object metadata.
- Legacy search: `query_records` retains its existing string-based filtering interface and 50-record/10-page limits. Object system names are resolved to the numeric object codes required by the API.
- Structured search: `query_records_v3` supports typed condition groups, related fields, multi-field sorting, relative date values, grouping, and `SUM`, `COUNT`, `MIN`, and `MAX`. Page sizes range from 1 to 500; use `isLastPage` to determine whether to fetch another page.
- Metadata: `list_objects`, `list_object_fields`, `get_field_metadata`, and `get_picklist_values` discover the CRM schema and valid picklist values.

For grouped queries, all selected fields without an aggregation function and all sort fields must appear in `groupBy`. Date-period grouping applies only to Date and DateTime fields.

## Provider references

- [Quick Start and authentication](https://developers.fireberry.com/docs/quick-start)
- [Record CRUD and metadata](https://www.fireberry.com/articles/getting-started-with-rest-api)
- [Metadata authentication](https://developers.fireberry.com/reference/get-all-objects)
- [Related records](https://developers.fireberry.com/reference/get-related-records)
- [Legacy query endpoint](https://developers.fireberry.com/reference/query-request)
- [Structured query endpoint](https://developers.fireberry.com/reference/query-request-v3)
- [Structured query guide](https://developers.fireberry.com/docs/queries-v3)

## Verification scope

This refresh was checked locally against the documented API contracts. Authenticated provider behavior was not verified live.
