# Countdown API

Countdown API provides structured eBay search, product, review, seller, and autocomplete data. Collections run saved requests in bulk; destinations deliver collection results to configured cloud storage.

## Authentication and configuration

Use an API key from the [Countdown API dashboard](https://app.countdownapi.com/signup). The client sends it as `api_key` to `https://api.countdownapi.com`. The read-only `get_account` tool identifies the account and reports usage without exposing the API key. OAuth, refresh tokens, and scopes do not apply.

The optional `ebayDomain` setting defaults to `ebay.com`. Each marketplace data tool can override it. The current official reference lists 19 domains; the existing `ebay.ph` choice remains available for saved-connection compatibility, although current support is unverified.

## Tools

| Tool | Purpose |
| --- | --- |
| `search_products` | Search eBay listings with filters, facets, and pagination. |
| `get_product` | Retrieve product details by EPID, GTIN, or URL. |
| `get_reviews` | Retrieve reviews, rating summary, and available pagination metadata. |
| `get_seller_profile` | Retrieve seller or storefront profile data. |
| `get_seller_feedback` | Retrieve seller feedback with documented filter combinations. |
| `get_autocomplete` | Retrieve search suggestions. |
| `get_account` | Identify the account and inspect credit usage, quotas, status, and history. |
| `list_collections` | Discover collections with search, filters, and pagination. |
| `get_collection` | Retrieve collection settings, status, and request/result counts. |
| `manage_collection` | Create, update, start, stop, or delete a collection. Starting spends request credits. |
| `list_collection_requests` | List saved requests in pages of up to 1,000. |
| `manage_collection_requests` | Add, update, delete, or clear saved requests. |
| `get_collection_results` | List result sets or retrieve one with downloadable JSON, JSON Lines, or CSV results. |
| `list_destinations` | Discover a page of configured storage destination IDs and names. |
| `list_error_logs` | Review failure IDs, dates, occurrence counts, and messages. |

## Collection workflow

Discover existing IDs with `list_collections`, or create a collection with `manage_collection`. Populate it with `manage_collection_requests` using provider snake_case request fields such as `type`, `ebay_domain`, `epid`, and `custom_id`. List the saved requests to obtain provider request IDs. Updates and deletions target these IDs. Make request-management calls sequentially to respect provider concurrency limits.

Start the collection with `manage_collection`. A collection supports up to 15,000 saved requests, or 100 when raw HTML is included; an add call accepts up to 1,000 requests. Provider capacity and available credits still apply. Get the result-set IDs using `get_collection_results`, then retrieve a selected result set in the desired format. Results are retained for 14 days and inactive collections are deleted after two months. Existing result metadata and download links remain available in structured output.

## Response handling and limits

HTTP and provider-declared failures produce actionable errors. Required malformed responses are rejected instead of being replaced with empty results or fabricated success. Pagination metadata is returned only when supplied by the provider. Real-time auto-pagination supports `maxPage` up to 5; collection requests support provider `max_page` up to 100. Search totals expressed as exact numeric strings are normalized to the existing numeric field while the original pagination object is preserved. Approximate or malformed totals are rejected.

The provider's product/review URL precedence notes conflict when multiple lookup modes are supplied; use one identifier mode per call. Parts compatibility requires EPID on the US or UK domain and cannot use a URL. Seller feedback filters have explicit combination restrictions documented in field help and validated before the request.

Cloud destination creation and credential administration, account-wide collection controls, and automatic webhook triggers are outside this integration's current tool surface. Configure cloud destinations in the provider dashboard and discover their IDs with `list_destinations`.

## Official references

- [Product Data API parameters](https://docs.trajectdata.com/countdownapi/ebay-product-data-api/parameters/common)
- [Collections API](https://docs.trajectdata.com/countdownapi/collections-api/overview)
- [Account API](https://docs.trajectdata.com/countdownapi/account-api)
- [Destinations API](https://docs.trajectdata.com/countdownapi/destinations-api/overview)
- [Error Logs API](https://docs.trajectdata.com/countdownapi/errorlogs-api/list)
