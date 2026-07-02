There are multiple providers with "HTML to Image" in their name. The most prominent one is **HTML/CSS to Image** (htmlcsstoimage.com / hcti.io). Let me get more details on their templates and advanced features.# Slates Specification for HTML to Image

## Overview

HTML/CSS to Image (htmlcsstoimage.com) is an API service that converts HTML/CSS markup and public URLs into images (PNG, JPEG, WebP) and PDFs. It renders images exactly like Google Chrome and supports reusable templates with variable substitution for dynamic image generation.

## Authentication

The API uses HTTP Basic authentication. Your username is your User ID and your password is your API Key. Both of these are available from the dashboard at `https://htmlcsstoimage.com/dashboard`.

To authenticate, include the credentials in the `Authorization` header using standard HTTP Basic auth (Base64-encoded `UserID:APIKey`), or use your HTTP client's built-in basic auth support. For example, with cURL: `-u 'UserID:APIKey'`.

Treat your API Key like a password. If exposed, it could be used to create images using your account.

The API base URL is `https://hcti.io/v1`.

## Features

### Image Generation from HTML/CSS

Generate images by providing HTML content and optional CSS. Either a `url` or `html` parameter is required, but not both. CSS is optional. The API returns a permanent, CDN-cached URL to the generated image.

- **Output formats**: The API supports JPG, PNG, WebP, and PDF. If no file extension is passed, you'll get back a PNG by default.
- **Google Fonts**: Use the `google_fonts` parameter to load any font from Google Fonts. Multiple fonts can be separated with a pipe character (e.g., `Roboto|Open Sans`).
- **Device scale**: Adjusts the pixel ratio for the screenshot. Minimum: 1, Maximum: 3.
- **Render delay**: A configurable number of milliseconds the API should delay before generating the image, useful when waiting for JavaScript.
- **Render when ready**: Set to true to control when the image is generated. Call `ScreenshotReady()` from JavaScript to generate the image.
- **Viewport dimensions**: Set custom width and height for Chrome's viewport. Both must be specified together.
- **CSS selector cropping**: Use a CSS selector for an element on the webpage to crop the image to that specific element.
- **Advanced cropping**: Advanced cropping options for precise control over the rendered image region.

### URL to Image (Screenshots)

Pass a URL or entire webpage to the API to generate a full page screenshot. Supports any public URL. Useful for archiving, previews, and automated captures.

### Image Templates

A template allows you to define HTML that includes variables to be substituted at the time of image creation. Templates support Handlebars variables, allowing you to place `{{title_text}}` in your HTML and have that replaced with any value you'd like while creating your image.

- Create, edit, list, and version templates.
- When you create an image using a `template_id`, it will automatically utilize the most recent version. You can also target a specific `template_version`.
- Create images using signed URLs in a GET request (no need to POST and store the URL). Useful for social sharing images such as `og:image` or `twitter:image`.
- Free plans can create 1 template. Paid plans can create 1,000.

### Image Management

- Delete an image by sending a DELETE request. This will remove your image from servers and clear CDN caching.
- Delete multiple images at once by sending their IDs.
- Retrieve a list of all images created by your account.
- Generated image URLs are permanent for as long as your account is active and are automatically cached and optimized by Cloudflare's CDN.
- Images can be resized on the fly by appending query parameters (width, height) to the image URL, with automatic aspect ratio preservation.

### PDF Generation

Render your image or screenshot as a PDF. Change the file extension on the returned URL to `.pdf` to get PDF output.

## Events

The provider does not support events. HTML/CSS to Image is a stateless image generation API with no webhook or event subscription functionality.
