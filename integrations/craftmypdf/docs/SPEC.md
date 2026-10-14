# CraftMyPDF integration

CraftMyPDF generates PDFs and images from reusable templates and JSON data.

## Authentication and regions

An API key from the API Integration dashboard is sent in the `X-API-KEY` header. The supported regions are Singapore (`default`), US East (`us`), Frankfurt (`eu`), and Sydney (`au`). Existing region values remain supported.

## Supported workflows

- Generate PDFs and JPEG/PNG images, with downloadable results.
- Submit asynchronous PDF generation and receive the completion callback at a supplied webhook URL.
- Merge existing PDF URLs or generate a combined document from multiple templates.
- Add watermarks or positioned text and fill existing PDF form fields.
- Retrieve PDF page count and document metadata. Page dimensions and form-field details are returned only if the provider supplies them.
- List, retrieve, clone, update, and delete templates; list template versions.
- Create embedded editor sessions and deactivate them using the returned session token.
- Retrieve connected-account quota counters and transaction history, including asynchronous delivery status.

Generated CDN URLs expire after the requested lifetime, which defaults to five minutes. Synchronous generation and manipulation tools provide downloadable copies before those URLs expire. The API reference does not document a URL-renewal endpoint; downloading a generated copy does not submit a new generation request.

## References

- [API reference](https://craftmypdf.com/docs/)
- [REST API guide](https://support.craftmypdf.com/rest-api-integration)
- [Secure access to generated PDFs](https://support.craftmypdf.com/secure-pdf-generation)
- [Asynchronous delivery and monitoring](https://support.craftmypdf.com/async-pdf-generation-retries-failures-monitoring)
