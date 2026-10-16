# Shorten.REST Integration

Manage short URL aliases and retrieve click records using the [official API reference](https://docs.shorten.rest/) and [Swagger specification](https://docs.shorten.rest/swagger.json).

## Authentication and configuration

All API operations use `https://api.shorten.rest` with an API key in the `x-api-key` header. Obtain a key from [the account dashboard](https://dash.shorten.rest). No OAuth flow or global resource configuration is required. Domains belong in tool inputs; omitted domains default to `short.fyi`.

## Operations

| Tool | API request | Behavior |
| --- | --- | --- |
| `create_alias` | `POST /aliases` | Alias and domain are query parameters. Destinations, meta tags, and snippets are JSON body properties. |
| `get_alias` | `GET /aliases` | Query by alias and domain. A documented null result is reported as an alias-not-found error. |
| `update_alias` | `PUT /aliases` | Query by alias and domain, with only changed properties in the JSON body. Every supplied array fully replaces its previous value. |
| `delete_alias` | `DELETE /aliases` | Query by alias and domain. The API returns an empty success response. |
| `list_aliases` | `GET /aliases/all` | Query by domain, `continueFrom`, and optional limit. Returns aliases in descending creation order. |
| `get_clicks` | `GET /clicks` | Filters one account-wide click page by each record's `alias` and `domain` fields. |
| `list_clicks` | `GET /clicks` | Returns one unfiltered account-wide click page, newest first. |

## Alias settings

Alias paths omit the leading slash. Domain names omit the URL scheme and path. Missing or empty create-alias names generate seven random characters; the first `@rnd` macro can mix a custom prefix with a random suffix. Alias names are unique within their domain, and API parameters are case sensitive.

Destinations contain a URL and optional country and operating-system targeting. Operating-system matching takes precedence over country matching. Destination URLs have a maximum length of 8192 characters. Meta tags use name/content pairs; snippets use an identifier and optional string parameters. Alias-level settings override domain defaults.

Custom domains, their defaults, and API keys are managed in the provider dashboard. No domain-management, current-user, or webhook endpoint appears in the documented API surface, so this integration adds no such operation.

## Pagination and click scope

List limits range from 1 to 1000; the provider default is 1000. The API returns a `lastId` cursor. Tools expose it as `nextCursor` and send a supplied `cursor` as `continueFrom` on the next request.

The documented `GET /clicks` endpoint accepts only pagination parameters and returns account-wide records. `get_clicks` therefore retrieves exactly one page and filters it locally using the requested alias and domain. Its limit controls the number of account records examined. A page can return no matches while still providing `nextCursor`; continue until the cursor is absent. `list_clicks` exposes the account-wide stream directly.

Provider timestamps are epoch milliseconds and are returned as ISO timestamps. Invalid responses and unavailable required output fields produce descriptive errors rather than invented identifiers or timestamps. Unspecified meta tags and snippets are returned as empty lists.
