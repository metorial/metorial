# TinyPNG

Optimize images through the Tinify API: compress, resize, convert formats, preserve supported metadata, save to Amazon S3 or Google Cloud Storage, and read monthly compression usage.

Connect with a Tinify API key. An empty validation request verifies the credential and reads the available usage header without submitting an image. The API does not expose an account-owner identity endpoint.

Image tools accept a publicly accessible HTTP or HTTPS source URL. Source submission starts compression and may consume quota or incur charges. Resize, conversion and cloud storage can add usage; request options are checked before submitting the source. A later failure does not reverse an already accepted compression or storage write.

Compression returns a downloadable image and any statistics supplied by the provider. Original image URLs require authentication. Resized, converted and metadata-preserved images are downloaded from the processing response; the original compressed URL is not a link to those processed results. Existing output fields remain available when native data exists; missing counts, sizes or dimensions are omitted rather than replaced with zero.

Scale requires exactly one positive integer dimension. Fit, cover and thumb require both dimensions. Target formats accept a MIME type, a nonempty list of MIME types, or the single `*/*` wildcard. Background fills require a conversion target and a six-digit hex color, white or black. Copyright and creation metadata support PNG; GPS location is JPEG-only.

Cloud storage uses the supplied destination credentials and exact bucket/object path. It can overwrite an existing object. Receipt URLs need not be publicly accessible. S3 defaults can make objects public unless the requested ACL/bucket policy changes access. S3 ACL options accept object canned ACLs or `no-acl`; unsupported ACLs are rejected before source compression. Only the documented Cache-Control header is exposed.

The integration bounds fetched image results at 64 MiB and does not follow redirects with credentials. There is no documented image inventory, deletion, identity or URL-renewal API. Provider retention and usage remain in effect after download; request results promptly.
