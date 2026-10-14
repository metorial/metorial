# <img src="logo.svg" height="20"> Zyte API

Fetch and extract web content with automatic anti-bot handling. Perform raw HTTP requests or render pages that execute JavaScript. Extract products, articles, job postings, forum threads, or search results with `extract_serp`. Download response bodies, rendered HTML, and JPEG screenshots. Existing response body, HTML, and screenshot fields remain available for existing workflows. Browser action timeout and typing delay inputs use milliseconds.

Custom attributes are passed as a map of attribute names to schemas; results include the provider's `values` and `metadata` envelope. Use `browserHtml` or `httpResponseBody` for extraction. The legacy `browserHtmlOnly` option is retained but unsupported by the current API. Model pinning is available only for product extraction. File uploads through `setInputFiles` and regular-expression network capture are unsupported. Use `values` for select actions and `url` for request/response waits.

The Stats API requires a separate Zyte dashboard API key, so it is outside this integration's extraction API credentials.

Official references: [API reference](https://docs.zyte.com/zyte-api/usage/reference.html), [custom attributes](https://docs.zyte.com/zyte-api/usage/extract/custom-attributes.html), [browser automation](https://docs.zyte.com/zyte-api/usage/browser.html), and [Stats API authentication](https://docs.zyte.com/zyte-api/usage/stats/index.html).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
