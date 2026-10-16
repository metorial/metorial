# Kraken.io API coverage

Kraken.io optimizes images and PDFs from publicly accessible URLs. Credentials
are an API key and API secret from the account's API Credentials section; both
are sent in the JSON request's `auth` object. No OAuth refresh or scopes apply.
The optional sandbox setting sends `dev: true` only to optimization requests.

| Tool | Provider operation | Coverage |
| --- | --- | --- |
| `optimize_image` | `POST /v1/url` | Lossless/lossy optimization, quality, chroma subsampling, resizing, conversion, metadata, auto-orientation, optional Amazon S3 storage |
| `generate_image_sets` | `POST /v1/url` | One to ten variants, independent resize/quality overrides, conversion, metadata, optional Amazon S3 storage |
| `get_account_status` | `POST /user_status` | Current account's active status, plan, and byte quotas |

Resize strategies include exact, portrait, landscape, auto, crop, square, fit,
and fill. Image sets also support `none`. Square resizing accepts `size` in
pixels. Custom crops accept `x`, `y`, `width`, `height`, and a scaling percentage;
50 produces half-size dimensions. Crop and fit support crop gravity, and fill
supports a background color. Existing width/height-only requests are forwarded
without adding a size or changing the provider's defaults.

Conversion supports jpeg, png, gif, webp, and avif, with background and
keep-extension options. S3 storage requires a per-variant `storagePath` for
image sets. Private S3 objects require the customer's own authorized retrieval.

Without a nonempty `callbackUrl`, optimization waits for results. With a callback
URL, Kraken.io returns a request ID and later POSTs JSON results to the supplied
URL. Submission acknowledgment is distinct from completed optimization; no
generated file is claimed for an asynchronous acknowledgment.

Synchronous results preserve provider metadata, actual URLs, and the complete
raw response. Completed files are downloaded once for delivery because Kraken.io
retains its generated files for only one hour and documents no renewal endpoint.
Only HTTPS URLs on `dl.kraken.io` and `s3.amazonaws.com` are fetched; redirects
are refused. Downloads are limited to 50 MiB and must have a supported MIME type
and matching file signature. A download failure preserves completed optimization
results and adds an explicit file-delivery warning. Optimization is never
repeated to renew or retrieve a result.

The account-status tool provides the documented read-only account context.
Kraken.io does not document a separate profile/identity endpoint with a stable
account ID. All tools serve one image-optimization product.

## Official references

- [Getting started, authentication, responses, and one-hour retention](https://kraken.io/docs/getting-started)
- [URL optimization](https://kraken.io/docs/upload-url)
- [Resize strategies, square size, custom crops, and scale](https://kraken.io/docs/image-resizing)
- [Image sets and per-variant overrides](https://kraken.io/docs/generating-image-sets)
- [Wait and callback responses](https://kraken.io/docs/wait-callback)
- [Format conversion](https://kraken.io/docs/image-type-conversion)
- [Custom quality](https://kraken.io/docs/custom-image-quality)
- [Amazon S3 storage and output URLs](https://kraken.io/docs/storage-s3)
- [Account status](https://kraken.io/docs/user-status)
- [Sandbox](https://kraken.io/docs/sandbox)
- [HTTP failures](https://kraken.io/docs/http-status-codes)
