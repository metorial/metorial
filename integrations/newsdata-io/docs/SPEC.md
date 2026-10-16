# NewsAPI API details

This integration connects to NewsAPI.org at `https://newsapi.org/v2` using a NewsAPI API key. Its three tools cover the provider's documented article, headline, and source endpoints.

## Authentication

Obtain an API key at [newsapi.org/register](https://newsapi.org/register). Requests send it in the `X-Api-Key` header, one of the [documented authentication methods](https://newsapi.org/docs/authentication). There is no OAuth exchange or token refresh. Connection configuration does not require a publisher, country, or other resource identifier.

## Search Articles

[`GET /v2/everything`](https://newsapi.org/docs/endpoints/everything) searches articles using the following inputs:

| Tool input | Provider query parameter |
| --- | --- |
| `query` | `q` |
| `searchIn` | `searchIn` |
| `sources` | `sources` |
| `domains`, `excludeDomains` | `domains`, `excludeDomains` |
| `fromDate`, `toDate` | `from`, `to` |
| `language`, `sortBy` | `language`, `sortBy` |
| `pageSize`, `page` | `pageSize`, `page` |

Queries support quoted phrases, required/excluded terms with `+`/`-`, and `AND`, `OR`, or `NOT` with parentheses. The provider limits `q` to 500 characters and source lists to 20 identifiers. `searchIn` accepts comma-separated `title`, `description`, and `content`. Sorting supports `relevancy`, `popularity`, and `publishedAt`; the provider default is `publishedAt`.

The default page size is 100 and the maximum is 100. Page numbering starts at 1. Date coverage and retrievable result limits depend on the account plan.

## Top Headlines

[`GET /v2/top-headlines`](https://newsapi.org/docs/endpoints/top-headlines) accepts `query` (sent as `q`), `country`, `category`, `sources`, `pageSize`, and `page`. The provider prohibits combining `sources` with `country` or `category`. The current country support is documented as `us`; categories are `business`, `entertainment`, `general`, `health`, `science`, `sports`, and `technology`.

The default page size is 20 and the maximum is 100. Page numbering starts at 1.

## Discover Sources

[`GET /v2/top-headlines/sources`](https://newsapi.org/docs/endpoints/sources) returns the publishers available for headlines. Optional `category`, `language`, and `country` filters are sent with the same names. This endpoint does not offer pagination. Use the returned `sourceId` values in the article and headline tools.

## Results and pagination

Article tools preserve the provider's source identifier/name, author, title, description, article URL, image URL, publication time, and content. Provider null values remain null. Content is limited to 200 characters when available; the article URL leads to the publisher's full text.

All tools include `rawResponse`, preserving the complete original response, including status and any additional article/source metadata. Article tools also return the requested page or the provider default of 1. When `totalResults` exceeds `page * pageSize`, `nextPage` is the next page number. Continue with the same filters and page size. The reported total does not override account plan limits on accessible results.

Inputs are forwarded as supplied, and omitted pagination inputs are left for the provider defaults. Existing string filters, language/category values, and article/source output types remain supported.

## Errors and API scope

[NewsAPI errors](https://newsapi.org/docs/errors) include an HTTP status, provider `code`, and remediation `message`. Upstream failures return a structured service error retaining the provider message, status, and code when supplied, including authentication, quota, rate-limit, and parameter failures.

The documented API is read-only. It exposes no suitable current-user/account identity endpoint or webhook registration endpoint.
