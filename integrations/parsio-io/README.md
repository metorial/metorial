# Parsio.io

Manage Parsio mailboxes, submit HTML or text for asynchronous or synchronous parsing, retrieve extracted JSON, and inspect document processing. List, inspect, enable, disable, delete, or clone existing templates between mailboxes. Configure and inspect webhooks, retrieve collected emails, and reprocess or skip documents.

HTML/text submission supports template-based and GPT-powered mailboxes. A synchronous request can return while parsing continues; use the returned document ID with `get_document`. List tools return one page where pagination is supported. Document lists accept a page size of 1–500 and date filters in `YYYY-MM-DD` format.

Authenticate with the API key from your [Parsio account](https://app.parsio.io/account). See the [official API reference](https://help.parsio.io/public-api/parsio-public-api) for parser settings and [text/HTML parsing](https://help.parsio.io/public-api/parse-html-and-text-documents-using-api-1) for parser compatibility.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
