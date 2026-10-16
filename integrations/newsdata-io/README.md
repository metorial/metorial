# NewsAPI

Search articles, retrieve top headlines, and discover publishers with [NewsAPI.org](https://newsapi.org/docs). Connect with a [NewsAPI API key](https://newsapi.org/register).

Use **Discover Sources** to find source identifiers, then pass them to **Search Articles** or **Top Headlines**. Article searches support keywords, source and domain filters, date ranges, language, and sorting. Headlines support keywords, category, country, or sources; country/category cannot be combined with sources. The current country support for headlines is documented as `us`.

Article tools return `totalResults`, normalized articles, the requested `page`, and `nextPage` when the reported total suggests another page. Pass `nextPage` back with the same filters and page size. The provider defaults to 100 articles for search and 20 for headlines, with a maximum of 100 per page. Historical coverage and accessible results depend on the account plan. Every tool also returns `rawResponse` with the complete original response and metadata.

Article content may be truncated to 200 characters; follow the article URL for the publisher's full text. These tools connect to NewsAPI.org and require its credentials.

See [API details](docs/SPEC.md) for endpoint, authentication, and error behavior.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
