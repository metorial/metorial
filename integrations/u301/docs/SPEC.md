# U301 Integration Specification

## Authentication

Connect with the existing API Key method (`api_key`). The token is sent as `Authorization: Bearer <token>`. Create an API key in the [U301 dashboard](https://u301.com/app/api-key). API keys can expire according to their dashboard settings; reconnect with a new token when needed. No OAuth refresh flow is documented for this method. No connection configuration fields or workspace IDs are required at setup.

## Existing capabilities

The original tools continue to use `https://api.u301.com/v2`:

| Tool | Request | Result |
| --- | --- | --- |
| `shorten_url` | `GET /shorten` with URL and optional domain, slug and title | Code, original URL, shortened URL and provider status |
| `delete_link` | `DELETE /links/{shortenedLink}` | Provider success flag |
| `list_domains` | `GET /shorten-domains` with optional visibility and pagination | Available domains and provider pagination |
| `generate_qr_code` | `GET /qrcode` with appearance options | SVG content and a downloadable SVG file |

The SVG content field remains available for existing callers. Download preparation does not establish later file availability. The stable provider QR endpoint uses the same token and query parameters when the file is downloaded.

Current provider documentation primarily covers V3. The existing V2 routes, field names and output contracts are retained for compatibility; V3 availability does not imply that V2 is retired.

## Workspace and link discovery

The new read-only tools use `https://api.u301.com/v3`:

| Tool | Request | Result |
| --- | --- | --- |
| `list_workspaces` | `GET /workspaces` | Provider JSON containing accessible workspace information |
| `get_link` | `GET /shorten/{domain}/{slug}` | Link details, destination, owner, workspace and state |
| `list_links` | `GET /shorten/list` | Links plus total, page and page-size metadata |
| `get_click_analytics` | `GET /shorten/analytics/clicks` | Start/end timestamps and daily or hourly click data |

Call `list_workspaces` to discover the workspace ID used by `list_links` and `get_click_analytics`. `get_link` accepts an optional workspace ID. Workspace discovery retains the provider JSON because the official collection does not publish its response schema. No undocumented workspace field names are assumed.

Link listing accepts positive whole page and page-size values. Omitting page uses page 1; omitting page size leaves U301's default of 10. List responses retain `domainName` and nullable expiry/update values. Single-link responses use `domain`; raw provider fields are retained without fabricating missing values.

Click analytics supports `24h`, `1d`, `3d`, `7d`, `14d`, `30d`, `60d` and `1m`, with `day` or `hour` granularity. Timezone is optional and uses U301's UTC default. Analytics aggregates the entire selected workspace.

## Provider limits

U301's documented monthly workspace link allowance is shared across V2, V3, website and bulk operations. A monthly allowance failure returns HTTP 429 with `MONTHLY_LINK_LIMIT_REACHED`; immediate retries do not restore the allowance. Existing short links continue to work. The client preserves provider status, code and body error details.

## Scope and verification

No suitable documented self/profile endpoint was found; workspace discovery provides the documented connection-context discovery. Billing, paid domain redirect features, translator and emoji utilities are outside the common link-management scope. No webhook registration contract was established.

Official references: [API documentation](https://u301.com/docs), [link retrieval](https://u301.com/docs/links/get), [link listing](https://u301.com/docs/links/list), [click analytics](https://u301.com/docs/analytics/clicks), [official SDK source](https://github.com/u301-shortener/u301-js), and [official Postman collection](https://www.postman.com/tealightuk/u301/collection/xvm0lzp/u301-url-shortener-v3).
