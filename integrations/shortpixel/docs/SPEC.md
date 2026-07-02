# Slates Specification for Shortpixel

## Overview

ShortPixel is a cloud-based image optimization service that compresses, resizes, and converts images and PDFs to reduce file sizes. It offers on-the-fly solutions and APIs for delivery of next-gen images like WebP or AVIF. ShortPixel can compress JPGs (including JPEG 2000 and XR), PNGs, GIFs (including animated ones), and PDFs.

## Authentication

ShortPixel uses **API Key** authentication. The API Key is a unique code that represents the bridge between ShortPixel and its service. After you register a ShortPixel account, you will receive an email with the API Key.

- **Obtaining an API Key:** Sign up using your email at https://shortpixel.com/free-sign-up. You will receive your personal API key in a confirmation email. You can also find it in the ShortPixel dashboard under "API Keys".
- **Key format:** The API Key is a string of 20 letters and numbers.
- **Usage:** The API key is passed as a `key` parameter in the JSON body of API requests. For example: `{"key": "YOUR_API_KEY", "lossy": 1, "urllist": ["https://example.com/image.jpg"]}`.
- **Key Aliases:** With the API Key Aliases option, found on the API Keys page of the ShortPixel dashboard, you can quickly create and manage temporary or permanent API keys for use on multiple websites.
- As long as you have available credits, you can use a single API Key on as many websites as you wish.

## Features

### Image Optimization via URL (Reducer API)

Allows you to resize, optimize, and convert an image based on its URL. The image must be available online to be processed using this API. Requests are sent as HTTP POST to `https://api.shortpixel.com/v2/reducer.php`.

- **Compression levels:** Lossy (best compression), Glossy (high quality lossy), or Lossless (identical to original).
- **Format conversion:** Convert images to WebP, AVIF, or between JPEG/PNG/GIF formats. Multiple output formats can be requested simultaneously (e.g., `+webp|+avif`).
- **Resizing:** Supports outer resize, inner resize, and AI-powered smart cropping.
- **Upscaling:** Images can be upscaled by a factor of 2x, 3x, or 4x.
- **Background removal:** Remove backgrounds or replace them with a color or another image.
- **CMYK to RGB conversion** and **EXIF data management** (keep or strip).
- Supports processing up to 100 URLs in a single request.
- A synchronous endpoint (`reducer-sync.php`) is available that returns the optimized image directly instead of a download URL.

### Image Optimization via Upload (Post Reducer API)

The POST Reducer API allows you to shrink an image that is not accessible online, by uploading it to the servers via a POST HTTP call. Requests use multipart form data to `https://api.shortpixel.com/v2/post-reducer.php`.

- Supports the same compression, conversion, resizing, and other options as the Reducer API.
- Files are uploaded directly rather than referenced by URL.
- If optimization is not complete immediately, the API returns a temporary URL that can be polled via the Reducer API endpoint.

### Adaptive Images / CDN API

Use this API to have images resized, optimized and converted to next-gen formats (e.g., WebP/AVIF) on-the-fly, and optionally also stored and delivered from ShortPixel's CDN.

- Images are accessed via a URL pattern: `https://cdn.shortpixel.ai/client/{parameters}/{original_image_url}`.
- **Parameters include:** width (`w`), height (`h`), crop style (`c` — supports smart cropping, top, bottom, left, right, center), special crop (`sc`), quality (`q` — lossy, glossy, lossless, lqip), and format conversion (`to` — webp, avif, auto).
- Any other CDN can be used if you point to `http://no-cdn.shortpixel.ai`. If you use a different CDN then image optimization credits will be used.

### Account & Domain Management

If you use ShortPixel Adaptive Images or other partner plugins and want to associate, remove domains or programmatically read their usage data, you can do so through CDN API endpoints.

- **Add domain:** Associate a domain with your API key for CDN usage.
- **Read domain status:** Check domain quota, CDN usage statistics, and association status.
- **Set/Revoke domain:** Associate or revoke a user from a domain.
- **API status:** Returns how many available credits the API key has, including monthly and one-time quota information.

## Events

The provider does not support events. ShortPixel's API is a request-response image processing service and does not offer webhooks, event subscriptions, or any built-in push notification mechanism for API consumers.
