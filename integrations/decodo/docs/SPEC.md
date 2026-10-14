# Decodo integration

## Authentication

The Web Scraping API uses Basic authentication with the scraping username and password. The Public API uses an API key in the `Authorization` header. These credentials serve different APIs; choose the method required by the tool.

The Public API manages residential proxy subscriptions. Its sub-user and whitelist management does not support datacenter or ISP products. Mobile support is limited to separate dashboard statistics endpoints.

## Scraping

`scrape_website` posts to `https://scraper-api.decodo.com/v2/scrape`. It preserves existing target templates and options for parsed JSON, Markdown, screenshots, browser actions, headers, cookies, locale, and proxy selection. Custom headers and cookies are forwarded by default when provided; optional `forceHeaders` and `forceCookies` fields can override that behavior.

`create_scrape_task` uses the documented `/v3/task` endpoint. `get_scrape_task_results` checks `/v3/task/{task_id}` and retrieves `/v3/task/{task_id}/results` after completion. Task results remain available for 24 hours. A task based on a query can omit the URL in its response. PNG screenshots are available as downloadable files, while existing result content remains in the output for compatibility. Screenshot support depends on the target and subscription.

Decodo now offers Web Data API with separate Bearer credentials. The provider's migration guide states that existing Web Scraping API setups continue working. This integration retains its existing Basic authentication and endpoints rather than substituting incompatible credentials.

## Residential proxy management

Existing tools list, create, update, and delete sub-users, retrieve traffic usage, list and manage whitelisted IPs, inspect subscriptions, and discover proxy endpoints. Create and update responses can be empty; the integration retrieves the resource afterward so its existing output contains confirmed identifiers and state. A null traffic limit denotes an unlimited sub-user. Subscription numeric strings are normalized to numeric values. Endpoint locations include provider hostnames and port ranges.

`get_sub_user` retrieves an individual sub-user using an ID from `list_sub_users`. `get_allocated_traffic_limit` reports the total GB assigned to sub-users. Custom traffic periods allow omitted dates, using provider defaults.

## Official references

- [Public API authentication](https://help.decodo.com/api-reference/public-api-key-authentication)
- [Public API OpenAPI document](https://help.decodo.com/api-reference/jero_public_api.yaml)
- [Real-time requests](https://help.decodo.com/docs/web-scraping-api-real-time-requests-2)
- [Asynchronous requests](https://help.decodo.com/docs/web-scraping-api-asynchronous-requests-2)
- [Parameters](https://help.decodo.com/docs/web-scraping-api-parameters-2-2)
- [Browser actions](https://help.decodo.com/docs/web-scraping-api-browser-actions-2)
- [Screenshot response](https://help.decodo.com/docs/web-scraping-api-screenshot-response-deprecated)
- [Web Data API migration](https://help.decodo.com/docs/web-data-api-migration-guide)
