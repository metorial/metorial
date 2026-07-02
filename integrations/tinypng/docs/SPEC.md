# Slates Specification for TinyPNG

## Overview

TinyPNG (Tinify) is an image optimization service that compresses AVIF, WebP, JPEG, and PNG images using lossy compression while preserving visual quality. The API also supports image resizing, format conversion, metadata preservation, and direct storage to cloud providers like Amazon S3 and Google Cloud Storage.

## Authentication

Authentication to the API is done with HTTP Basic Auth. All requests require an `Authorization` header that contains a Base64 digest of the authentication string `api:YOUR_API_KEY` where `YOUR_API_KEY` is the key that can be found on your API account page.

All requests must be made over an encrypted HTTPS connection.

To obtain an API key, enter your name and email address on the TinyPNG developers page to retrieve your API key. 500 free compressions are included each month, with no payment method required.

The API base URL is `https://api.tinify.com`. When making requests, provide the credentials as HTTP Basic Auth with `api` as the username and your API key as the password. For example:

```
Authorization: Basic <base64("api:YOUR_API_KEY")>
```

Or with curl: `--user api:YOUR_API_KEY`

## Features

### Image Compression

You can upload any AVIF, WebP, JPEG or PNG image to the Tinify API to compress it. The type of image is automatically detected and optimized with the appropriate engine. Compression starts as soon as you upload a file or provide the URL to the image.

- Images can be provided either as a binary file upload or by specifying a source URL.
- The compressed image is made available at a temporary URL returned in the response `Location` header.

### Image Resizing

The API can create resized versions of uploaded images. By letting the API handle resizing you avoid having to write such code yourself and only need to upload the image once. The resized images will be optimally compressed.

- **Resize methods:**
  - `scale` — Proportional scaling by specifying either a target width or height.
  - `fit` — Scales down to fit within given width and height dimensions.
  - `cover` — Scales and intelligently crops to fill exact dimensions, focusing on the most important areas.
  - `thumb` — Advanced cover mode that detects cut-out images with plain backgrounds and adjusts background space accordingly.
- If the target dimensions are larger than the original, the image will not be scaled up, to protect quality.
- Each resize counts as one additional compression.

### Image Format Conversion

You can use the API to convert images to a desired image type. Tinify currently supports converting between AVIF, WebP, JPEG, and PNG.

- You can specify a single target format, multiple formats (the smallest result is returned), or a wildcard (`*/*`) to get the smallest among all supported formats.
- Images with a transparent background can be filled with a color you specify when converting to a format that doesn't support transparency (e.g., JPEG). The background can be set as a hex value, `"white"`, or `"black"`.
- Image converting counts as one additional compression.

### Metadata Preservation

You can choose to preserve copyright information, the GPS location, and the creation date in compressed JPEG images. For PNG images, the copyright information can be preserved.

- Supported metadata types: `copyright`, `creation`, and `location` (JPEG only).
- Preserving metadata does not count as an additional compression.

### Direct Cloud Storage

You can instruct the API to save optimized images directly in your Amazon S3 or Google Cloud Storage buckets. You may also set custom Cache-Control and Expires headers.

- **Amazon S3**: Requires AWS access key ID, secret access key, region, and target path. Supports optional ACL configuration.
- **Google Cloud Storage**: Requires a GCP access token and target path.
- Each cloud storage upload counts as an additional compression.

### Compression Count Tracking

The API returns the number of compressions made during the current calendar month via the `Compression-Count` response header on most requests.

## Events

The provider does not support events.
