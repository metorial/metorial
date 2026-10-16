# <img src="logo.svg" height="20"> Typless

Extract structured fields, line items, and VAT rates from business documents with Typless. Submit documents for asynchronous processing, retrieve finished jobs from the poll queue, and add verified examples to training datasets. Legacy synchronous extraction, feedback, training, document discovery, and profile tools remain available.

Connect with an API key from **Settings > API Keys** in the Typless dashboard. The current workflow uses `extract_document_async`, `get_extraction_data`, and `list_pending_extractions`; `add_training_document` sends verified dataset examples. `get_current_user` reads the legacy account profile.

Current extraction results retain the provider's original values, including nulls. When the provider returns a URL for an adjusted document, it is also offered as a downloadable file. No expiry time is assumed.

See the [official API documentation](https://typless.gitbook.io/typlessapi/api-docs/api-schema) and [integration specification](docs/SPEC.md) for supported operations and legacy limitations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
