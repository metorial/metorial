# Slates Specification for Imgix

## Overview

Imgix is an image and video processing service that provides real-time, URL-based image transformation, optimization, and CDN delivery. It offers a Management API for programmatically configuring sources, managing assets, purging caches, and retrieving analytics reports, as well as a Rendering API that applies transformations via URL parameters.

## Authentication

All calls to the Imgix Management API require an API key. To create a key, navigate to the API Keys view in your Dashboard.

Authentication is performed by passing a valid API key in the request through the HTTP Authorization header. The API expects an authorization type `Bearer` followed by the alphanumeric API key in plaintext. Example: `Authorization: Bearer <your-api-key>`

Any user can create an API key, but a user will only be able to create a key that has permissions equal to or less than the user's own permissions.

**Base URL:** `https://api.imgix.com/`

**API Key Permissions (Scopes):**

Each API key can be granted one or more of these permissions:

- **Analytics** – Get analytics data using the reports API. **Sources** – Create, list, edit, and deploy Imgix Sources.
- **Purge** – Remove deleted or out-of-date assets from Imgix caches.
- **Asset Manager Browse** – List and get all content in the Asset Manager. **Asset Manager Edit** – Edit image metadata and upload assets (implicitly includes Browse).

Each Imgix account is limited to 20 API keys.

## Features

### Source Management

The Management API enables developers to programmatically configure their Sources and perform other activities related to their assets. Sources can be backed by Amazon S3, Google Cloud Storage, Microsoft Azure, Web Folders, Web Proxies, and S3-compatible storage providers (e.g., DigitalOcean, Cloudflare R2, Wasabi). You can create, list, update, and deploy sources, configure cache TTL behavior, set default rendering parameters, assign custom domains, and enable secure URL signing.

### Asset Management

Asset Manager operations are usually tied to a specific Source, specified by source_id. You can browse and search assets, view asset metadata (file size, dates, custom fields), and edit custom fields on assets. The API allows you to upload directly to your cloud-storage-backed Source (Azure, GCS, or S3). Uploading to Web Folder or Web Proxy Sources is not supported. Assets can also be refreshed to pull updated versions from origin, and published or unpublished to control CDN availability.

- Some asset detail features are restricted to Enterprise/Premium plans.

### Image Rendering and Transformation

The Rendering API can optimize your images and make it easy to create responsive designs. By adding parameters to your image URLs, you can enhance, resize and crop images, compress them and change format for better performance, create complex compositions, and extract useful metadata. These operations can be applied programmatically in real time across entire image libraries.

Key transformation categories include:

- **Size and Crop:** Resize, crop, fit modes, focal point cropping, face detection-based cropping.
- **Format and Compression:** Output format selection (JPEG, PNG, WebP, AVIF, etc.), quality control, auto-format.
- **Adjustments:** Brightness, contrast, saturation, hue, sharpening, blur, and enhancement.
- **Compositing:** Watermarks, blends, masks, text overlays with full typesetting control.
- **AI Features:** Background removal, background replacement via prompt, auto-generated image captions.
- The maximum supported canvas size is 8192px by 8192px.

### Video Processing

The Video API allows you to optimize and serve video to your users. Using the URL-based API, you can generate thumbnails and apply various transformations to your video content. It is ideal for quick playback on your website or app, best suited for videos shorter than 5 minutes.

- Long-form video support (over 5 minutes) is also available with features like adaptive bitrate streaming, storyboards, and thumbnail generation.
- Video-to-GIF conversion is supported.
- Auto-generated captions are available in configurable languages.

### Cache Purging

For performance reasons, Imgix will try to cache your origin assets for as long as possible, but if your asset changes at the origin you may want to purge it so that Imgix will fetch the newest version. You can purge individual asset URLs, and the request will purge all derivatives of the asset, so you don't have to do each one individually. Sub-image purging (for marks, blends, and masks) is also supported.

### Analytics and Reporting

Reports are updated once per day and are retained for 90 days after being finalized. Reports are finalized at 00:00 UTC and are available via API by 04:00 UTC. Available report types include image analytics and source analytics. The Image Analytics report is available to all paid customers, however other reports are a Premium feature and may not be enabled for all accounts.

### URL Signing / Secure URLs

You can secure asset URLs by generating signed URLs using an MD5-based signature with a Source-specific secure token. URLs can be given an expiration date via an `expires` parameter that takes a UNIX timestamp in the query string. If the path or parameters of your URL are altered after the signature has been set, the altered URL will return a "403 Forbidden" code instead of an asset.

## Events

The provider does not support events. There are no webhooks, event subscriptions, or purpose-built polling mechanisms available through the Imgix API.
