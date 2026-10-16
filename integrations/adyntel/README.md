# <img src="logo.png" height="20"> Adyntel

Research advertising across Meta, Google, LinkedIn, and TikTok, and compare paid and organic keyword metrics for a company domain.

Connect with the API key and email from the same Adyntel account. Credentials are sent in each JSON request body. No additional connection settings are required.

- Look up Meta ads by domain or Facebook page, paginate results, and filter by country, language, media, activity, or special category. Video searches can classify user-generated content.
- Look up Google ads with pagination, a country filter, and optional creative text extraction.
- Look up LinkedIn ads with pagination, date presets or a custom range, and optional EU transparency data.
- Search Meta and TikTok ads by keyword. Use **Get TikTok Ad** with the exact string ID from the TikTok search results.
- Retrieve Google Shopping ads automatically, or use **Submit Google Shopping Search** followed by **Get Google Shopping Status** to resume an existing search.
- Analyze keyword positions, traffic, estimated budgets, and CPC.

Each successful lookup generally costs one credit. Google text extraction and LinkedIn impression data cost two credits. Google Shopping status checks are free. Metadata summaries omit unavailable values; `rawResponse` preserves the provider's original response and null values.

**Get TikTok Ad Details** remains available for existing numeric-ID workflows and is deprecated in favor of **Get TikTok Ad**, which accepts IDs without numeric conversion.

See the [Adyntel API documentation](https://docs.adyntel.com/) and [integration reference](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
