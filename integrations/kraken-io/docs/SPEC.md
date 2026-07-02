Now let me look at the additional features like image resizing, type conversion, metadata, and the callback URL mechanism:# Slates Specification for Kraken.io

## Overview

Kraken.io is an image optimization and compression service that supports JPG, PNG, WebP, GIF, SVG, AVIF, HEIC, and PDF formats. It provides an API for optimizing images via URL or direct upload, with options for resizing, format conversion, and storage to external cloud providers.

## Authentication

To use the Kraken.io API, you need to sign up and obtain a unique API Key and API Secret, found in your account under the API Credentials section.

Authentication is performed by including an `auth` object in every API request JSON body:

```json
{
  "auth": {
    "api_key": "your_api_key",
    "api_secret": "your_api_secret"
  }
}
```

The API accepts HTTPS POST requests only, and all connections are SSL-secured.

There is no OAuth2 or token-based authentication. Every request must include both the `api_key` and `api_secret` in the `auth` object.

## Features

### Image Optimization and Compression

Optimize and compress images to reduce file size. Images can be provided either by URL or by uploading a file directly to the API.

- **Lossy optimization**: Uses an intelligent lossy scheme that automatically picks the best quality-to-size ratio. Enabled by setting `"lossy": true`.
- **Lossless optimization**: The default compression mode, which reduces file size without changing the image's informational value.
- **Custom quality**: Override default lossy settings to specify a custom image quality (1–100) for JPG, PNG, GIF, SVG, WebP, and AVIF.
- **Chroma subsampling**: Configurable sampling schemes for JPEG compression.

### Image Resizing

Resize images before optimization, with the API first resizing and then optimizing through its compression pipeline.

- **Strategies**: `exact`, `portrait`, `landscape`, `auto`, `crop`, `square`, and `fit`.
- **Enhancement**: An optional `"enhance": true` flag to improve sharpness when downsizing significantly.
- Images resized using portrait, landscape, or auto strategies will never be enlarged beyond the original dimensions.

### Responsive Image Set Generation

Upload a single image and get back up to ten separate sizes, incorporating different resizing strategies, within a single response.

- Each size in the set can use a different resizing strategy and quality settings.

### Image Format Conversion

Convert images from one format to another (e.g., PNG to JPEG, any format to WebP).

- A `convert` object specifies the target `format` and optional `background` color for transparency handling.
- Supported target formats include JPEG, PNG, GIF, WebP, and AVIF.

### Metadata Preservation

By default, the API strips all metadata (EXIF, XMP, IPTC tags, colour profile information, etc.) to minimize file size.

- Optionally preserve specific metadata by providing a `preserve_meta` array with values such as `date`, `copyright`, `geotag`, `orientation`, and `profile`.

### Automatic Image Orientation

Automatically correct image orientation based on EXIF data.

### External Cloud Storage

Store optimized images directly in your S3 bucket, Cloud Files container, Azure container, or SoftLayer Object Storage container. Google Cloud Storage is also supported.

- For each provider, you supply the relevant credentials and destination path in the request.
- ACL can be set to `public_read` or `private`.

### PDF Compression

Optimize and compress PDF files in the same way as image files.

### Account Status

Query your account status programmatically to retrieve details such as plan name, total quota, used quota, remaining quota, and account active status.

### Sandbox Mode

A sandbox mode for testing that parses requests, validates JSON, and processes uploads like production, but returns randomized optimization results instead of actually optimizing. Enabled by setting `"dev": true`.

## Events

Kraken.io supports event notifications via HTTP POST (webhooks) when an optimization process completes, allowing your app to be notified rather than keeping connections open.

### Optimization Completed

When using the `callback_url` option, the optimization results will be POSTed to the URL specified in your request. After optimization has completed, Kraken.io will POST a message to the callback URL, by default as `application/x-www-form-urlencoded` data. You can receive the response in JSON format by adding `"json": true` to the request parameters.

- The callback payload includes the file name, original size, optimized size, bytes saved, and a URL to download the optimized image.
- The `callback_url` is specified per-request, not configured globally. Each optimization request can have its own callback destination.
- Optimized images are available on Kraken.io servers for one hour only, so the callback should trigger a download promptly.
