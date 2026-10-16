# <img src="logo.svg" height="20"> Logo.dev

Look up company brand profiles, colors, social links, and logo metadata by domain, stock ticker, cryptocurrency symbol, ISIN, or company name. Search for matching company domains, generate logo display URLs, and download logo or brandmark files.

Configure a secret API key for brand, search, and file tools. Add a publishable key to create CDN display URLs. Search and brand requests consume API credits; CDN usage is separate.

Use `search_brands` to resolve a company name, `lookup_brand` for the current brand profile or a stable brand ID, and `download_brand_image` for a downloadable logo or brandmark. When a brand is still indexing, follow the returned retry guidance. `describe_brand` remains available for existing accounts enabled for the retired Describe API and is deprecated in favor of `lookup_brand`.

See the [specification](docs/SPEC.md) for supported options and limitations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
