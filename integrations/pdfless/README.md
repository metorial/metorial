# <img src="logo.png" height="20"> Pdfless

Discover workspace templates, inspect the workspace connected to your API key, and generate downloadable PDF documents with dynamic JSON data. Templates support variable interpolation, conditionals, array iteration, barcodes, metadata, and bookmarks. PDF protection and permission controls depend on your subscription.

## Tools

- `list_templates`: Retrieve one page of templates and their IDs for PDF generation.
- `generate_pdf`: Generate and download a PDF from a template, with optional password protection and permissions. The original provider URL remains available in the result and expires after ten minutes.
- `get_workspace`: Read the connected workspace's name, active status, and timestamps.

Templates are designed in the [Pdfless dashboard](https://app.pdfless.com). Requests authenticate with the workspace API key in the `apikey` header. PDF generation consumes account quota.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
