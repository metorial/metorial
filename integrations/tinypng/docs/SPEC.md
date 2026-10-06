# TinyPNG API coverage

The integration uses the current Tinify HTTP API at `https://api.tinify.com` with API-key Basic authentication. It retains five public tools and no events.

| Tool | Native behavior |
| --- | --- |
| `compress_image` | URL submission to `/shrink`; authenticated original download, or binary metadata-preservation response. |
| `resize_image` | Source compression then binary processing with scale, fit, cover or thumb. |
| `convert_image` | Source compression then binary format conversion and optional background fill. |
| `save_to_cloud` | Source compression then native S3/GCS store, optionally combining resize/conversion/preservation. Exact destination receipt is checked. Object canned ACLs and Tinify no-acl are validated before source submission. |
| `get_compression_count` | Empty credential-validation request and actual monthly usage header. |

Processing responses contain image bytes rather than a new processed URL. Images are provided as downloadable files; public outputs contain available metadata. No missing field is replaced with a fabricated zero. The API does not identify the key owner or list, delete or renew compressed images.

Source compression, transformations and cloud storage retain quota/charge effects. Cloud writes can overwrite targets and leave object versions, backups, access-policy changes and history. An accepted operation followed by a failed receipt or delivery needs reconciliation before retrying.

References: [HTTP API](https://tinify.com/developers/reference/http), [Node.js usage and validation](https://tinify.com/developers/reference/nodejs), [official client source](https://github.com/tinify/tinify-nodejs).

S3 ACL preflight follows Tinify's documented `no-acl` option and the [AWS object canned ACL set](https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#canned-acl). Bucket-only or unknown ACLs fail before compression; bucket policy and permissions still require provider verification.
