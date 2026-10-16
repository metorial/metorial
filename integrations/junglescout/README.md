# <img src="logo.svg" height="20"> Jungle Scout

Research Amazon products and keywords across ten marketplaces. Discover related keywords and compare ASIN rankings, search historical weekly keyword volumes, filter the product catalog, retrieve daily sales estimates, and analyze organic and sponsored brand visibility with top-product click and conversion data.

Create an API key in your Jungle Scout Developer account and connect its key name and secret. Select an authorized marketplace and the `junglescout` or `cobalt` account type. Requests use the provider's version 1 API. The three catalog and keyword searches expose cursor pagination; repeat the same filters when requesting the next page.

Every tool includes the complete provider response alongside the normalized fields. Unavailable numeric metrics remain null; genuine zero values are retained. Product search returns the ASIN separately from its marketplace-qualified provider ID.

The public API documents six research endpoints, all covered here. It does not expose a current-user endpoint, write operations, webhooks, or file downloads. See [the capability specification](docs/SPEC.md) and [official documentation](https://developer.junglescout.com/api).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
