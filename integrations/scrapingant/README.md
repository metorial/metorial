# <img src="logo.jpeg" height="20"> Scrapingant

Scrape web pages and extract data from websites using headless Chrome browsers with automatic proxy rotation, CAPTCHA bypass, and Cloudflare handling. Render JavaScript-heavy pages, execute custom JS snippets, and wait for specific page elements. Convert scraped HTML to Markdown for LLM/RAG use cases or save it as a downloadable Markdown file. Extract structured data using AI-powered extraction with free-form field descriptions. Configure proxy geo-targeting, block specific resource types, pass custom cookies and headers, and retrieve extended response data including cookies, headers, and XHR details. Check API credit usage and subscription status.

Browser-only options require browser rendering to be enabled. A successful scraping request can contain a target error page; use `scrape_extended` to inspect its `statusCode`. The Markdown endpoint does not expose the target status.

API reference: [request parameters](https://docs.scrapingant.com/request-response-format), [extended responses](https://docs.scrapingant.com/json-response), and [Markdown conversion](https://docs.scrapingant.com/llm-markdown).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
