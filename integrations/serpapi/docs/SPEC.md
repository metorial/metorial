# SerpApi API coverage

Fourteen tools cover web search (Google, Bing, DuckDuckGo, Yahoo, Yandex, Baidu, Naver), images (including Google Lens), news, videos, shopping, Maps, Flights, Scholar, Trends, Jobs, autocomplete, locations, account information and exact search archives. Each engine receives its documented native parameters.

Connect using your API key from https://serpapi.com/manage-api-key. Authentication verifies the free native Account API and binds its account ID to the key. Existing token-only connections remain usable; reconnect to store the additional account binding. Account information and locations are free. Searches may consume credits; cached requests are free only when all parameters match and the native cache is valid. This integration does not enforce a spending cap.

`async: true` returns native queued/processing status and the search ID. It cannot be combined with `noCache: true` or a Ludicrous Speed account. Use `get_search` to read the exact ID once rather than resubmitting a query. Native failure, pending status and missing metadata never imply completed results. Network failures may leave a search or charge; inspect native account history before retrying.

`get_search` can provide completed JSON/HTML files through the authenticated archive. The provider documents retention for up to 31 days after completion. No renewal or guaranteed expiry timestamp is invented. There is no search-history deletion, credit refund or cleanup tool.

Compatibility guidance:

- Google web `numResults` is retained in the schema but refused locally because Google no longer supports `num`. Page offsets advance by 10; `startOffset` permits an exact offset.
- Bing/Yahoo pages begin at 1. DuckDuckGo and Bing Images have variable page sizes: use `startOffset` after the first page. All offsets are native, not inferred completeness claims.
- Bing uses `mkt`/`cc`; DuckDuckGo uses `kl`. Supply country with language to form these native regional codes. Yandex uses a native `regionId` rather than an ISO country.
- Google Shopping's current layout ignores offset pagination; only page 1 is supported. Google Jobs discontinued `startIndex` and deprecated `chips`; use `nextPageToken` and native `filterToken` (`uds`).
- Fields without a documented meaning for the selected engine fail before a paid request with actionable guidance. No generic Google parameters are silently forwarded to other engines.
- Flight `stops` retains the native values: 0 any, 1 nonstop, 2 up to one stop, 3 up to two stops. Prices use only native currency information or the documented Flights default USD.
- Location IDs are native text in `nativeLocationId`; the historical numeric `locationId` remains optional and is never populated by lossy coercion. GPS uses native longitude, latitude order.
- Price ranges, native offer currency, Trends display strings/comparison values and both rising/top groups are preserved additively. No missing quota, price, stop count or total is invented.

Provider documentation: [Search](https://serpapi.com/search-api), [Account](https://serpapi.com/account-api), [Archive](https://serpapi.com/search-archive-api), [Locations](https://serpapi.com/locations-api), [Jobs](https://serpapi.com/google-jobs-api), [Shopping](https://serpapi.com/google-shopping-api).
