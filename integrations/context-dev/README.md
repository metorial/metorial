# <img src="https://provider-logos.metorial-cdn.com/context-dev.svg" height="20" alt="Context.dev"> Context.dev

Search and read the web, retrieve brand and company intelligence, parse documents, and manage asynchronous batches and recurring website monitors.

## Authentication

Connect with a Context.dev API key. The key needs permission for the operations you use. No workspace identifier or additional configuration is required. Operations can consume credits; people enrichment and browser actions can require a paid plan.

## Tools

Provides 40 tools for web data, company intelligence, document parsing, batches, and monitoring. `get_brand` returns structured brand data. Use [the API documentation](https://docs.context.dev) for field semantics and [the specification](docs/SPEC.md) for the complete argument inventory.

- Search, scrape, map, crawl, and research the web.
- Retrieve and search brands, extract styleguides, enrich people, and find company news.
- Parse document bytes into readable Markdown.
- Submit, inspect, cancel, and delete scraping batches.
- Manage monitors, runs, changes, capacity, usage, and webhook signing secrets.
- Inspect and retry webhook deliveries; inspect request logs and explicitly submit diagnostic feedback.

## Workflow guidance

Use search to discover sources, scrape for one known URL, map for URL discovery, crawl for a bounded set of pages, and batches for larger jobs. Poll batch status before requesting completed results. Monitors immediately establish a baseline and continue on a schedule until paused or deleted.

Browser actions can change websites. Deleting batches or monitors is permanent, webhook retries can deliver an event again, and rotating a signing secret requires updating the receiver. Feedback sends information to Context.dev and should contain only authorized, sanitized diagnostics.

Screenshots, original response bytes, and batch result files are downloadable results. Result files can expire; batch results are retained for seven days. Parsing accepts base64-encoded input up to 25 MiB after decoding.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
