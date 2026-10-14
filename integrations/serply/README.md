# Serply

Search Google and Bing programmatically and retrieve structured results for web, news, images, videos, products, jobs, academic papers, and Google Maps places. Track domain SERP rankings for SEO monitoring. News search supports country and language editions and optional publisher-link resolution. Maps search returns place identifiers, contact details, coordinates, and opening hours when available.

Google web searches return one page at a time, typically up to 10 results. Use `start` to page through results; requesting a larger `num` does not combine pages. The provider's total count can be unavailable, and the existing tools return zero in that case. Maps accepts up to 200 requested places and uses `country` and `interfaceLanguage` instead of proxy or device defaults. Jobs search supports US and Canada locations.

Get an API key from [the Serply dashboard](https://app.serply.io). See [Serply's API documentation](https://serply.io/docs) for endpoint behavior and limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
