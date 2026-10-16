# <img src="logo.png" height="20"> Alt Text.ai

Generate image alt text using a public image URL or base64 upload. Choose languages, SEO context, writing style, product details, and a Final Pass prompt. Read your account and credit usage, browse or search the image library, edit or delete records, process page images, and submit CSV batches.

Connect with an API key from **Account > API Keys**. `get_account` identifies the account and returns its actual usage and subscription data.

| Tool | Outcome |
| --- | --- |
| `generate_alt_text` | Generate alt text synchronously, including multiple languages and optional regeneration |
| `get_account` | Account name, credit usage, subscription details, and calling-key metadata |
| `get_image` | Read an image record by asset ID |
| `list_images` | Browse images with page size and exact source-URL filtering |
| `search_images` | Search by asset ID, URL substring, or alt text |
| `update_image` | Edit alt text, rename an asset, or update metadata |
| `delete_image` | Delete the image record and its stored alt text |
| `scrape_page` | Queue source-HTML images for background processing |
| `bulk_generate_alt_text` | Submit CSV text for batch generation and inspect row errors |

Raw uploads do not produce a durable image URL. Image results preserve all provider metadata in `raw` and language variants in `altTexts`. Legacy fields that the provider does not return are omitted. Creation timestamps retain epoch seconds as strings. Generation waits up to 25 seconds total, including bounded retrieval of an accepted image that is still processing; pending or lookup errors include its real asset ID for `get_image` recovery without resubmitting. Page and CSV processing return submission results; use image read/search tools later for final alt text. No CSV export endpoint is documented by the developer API.

See the [API reference](https://alttext.ai/apidocs) and [integration specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
