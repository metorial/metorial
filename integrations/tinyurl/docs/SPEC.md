# TinyURL API specification

## Sources

- [Official OpenAPI 2.4.2](https://tinyurl.com/openapi/v2.json), as linked by the [developer documentation](https://tinyurl.com/app/dev).
- [Token permissions](https://tinyurl.com/blog/what-permission-tinyurl-api-tokens/).
- [List behavior and response example](https://tinyurl.com/blog/how-get-list-tinyurls-api/).
- [Archive behavior](https://tinyurl.com/blog/how-archive-using-tinyurl-api/).

Reviewed 2026-10-15. Base URL: `https://api.tinyurl.com`.

## Authentication and configuration

Use a Bearer API token created in [API settings](https://tinyurl.com/app/settings/api). Select permissions for the operations needed. There is no OAuth flow or connection configuration. The published API does not expose a current-user or account endpoint.

## Tools

| Tool | Behavior |
| --- | --- |
| `create_tinyurl` | Shorten a destination, optionally using a custom alias, domain, tags, description, or expiration. |
| `get_tinyurl` | Read link details and analytics settings. |
| `list_tinyurls` | List available or archived links; filter by creation dates or `alias:`/`tag:` search. Fetch details per result to retain destination and hit outputs. |
| `count_tinyurls` | Count links using the same filters without fetching individual details. |
| `update_tinyurl` | Change destination, metadata, analytics collection, or optional public analytics sharing; then retrieve complete details. |
| `delete_tinyurl` | Permanently delete a link. |
| `archive_tinyurl` | Toggle archive state and retrieve complete details. |
| `get_analytics` | Retrieve the existing seven report types. A start datetime is required; omitted end time means now. Location reports default to countries (`world`). |

Updates use the returned domain and alias after a rename. Mutations are sequential and are not transactional; a later failure may leave an earlier change applied. A failed final detail read surfaces an error that warns the change may already have been applied.

Analytics filters accept a full TinyURL without its scheme. A bare alias is interpreted on `tinyurl.com`. Report data is returned without flattening its provider-specific structure.

## Availability and limits

Tags, descriptions, expiration, changing destinations, and analytics are subject to subscription and token permissions. Listing is documented as available with any valid account token; the public count operation documents authentication but no additional permission or plan restriction. Account-specific availability was not verified.

The published list/count API has no pagination parameters. List hydration increases requests with the number of matching links; use filters or `count_tinyurls` for large accounts. The list schema in OpenAPI describes a single alias, while the official help response shows an array; the implementation follows that response example.

Public API documentation includes bulk processing and raw logs, but this integration does not expose those operations. Branded domains can be used in link tools; buying, configuring, or discovering domains is not in the published API. No webhook subscription API is documented.
