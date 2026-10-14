# Openperplex

Perform AI-powered web searches with generated answers, sources, and citations. Search with customizable models, locations, languages, and recency filters. Execute custom searches with tailored system prompts for summarization, analysis, or structured extraction. Ask questions about a specific web page, extract page content as text or Markdown, and capture downloadable website screenshots.

The integration exposes five non-streaming tools: `web_search`, `custom_search`, `query_url`, `extract_content`, and `website_screenshot`. Screenshot results retain the provider URL as well as offering a download.

OpenPerplex uses an API key sent in the `X-API-Key` header. See the [API reference and compatibility notes](./docs/SPEC.md) for supported inputs and provider availability limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
