Let me get more details on the specific parameters available.The parameters table didn't render properly. Let me search for the specific parameters.I now have enough information to write the specification. Let me compile everything I've gathered.

# Slates Specification for Apiflash

## Overview

ApiFlash is a website screenshot API that converts URLs into images. It uses an up-to-date version of Chrome to ensure that all modern web features are fully supported and rendering is accurate. It is built on AWS Lambda and provides built-in integration with Amazon S3 buckets to automatically save screenshots.

## Authentication

All API calls need to be authenticated using a valid access key that can be found in the dashboard. For a GET request, the access key is passed in the query string as all other parameters.

When you sign up, an access key is automatically created. You can manage all your access keys from your dashboard. To make a successful API call you just have to fill the `access_key` parameter with a valid access key.

**Method:** API Key (passed as a query parameter or form data field)

**Base endpoint:** `https://api.apiflash.com/v1/urltoimage`

**Example (GET):**

```
GET https://api.apiflash.com/v1/urltoimage?access_key=YOUR_ACCESS_KEY&url=https://example.com
```

**Example (POST):** The access key is passed as form data along with all other parameters.

There is no OAuth flow or other authentication method. Only access key authentication is supported.

## Features

### Website Screenshot Capture

Capture screenshots of any publicly accessible URL. By default the API returns the screenshot image data directly. If the `response_type` parameter is set to `json`, the response contains a JSON document with links to the resulting screenshot.

- **URL:** The target webpage URL (required).
- **Output format:** Supports PNG, JPEG, and WebP formats.
- Automatic detection of fully loaded pages before screenshot capture. A `delay` parameter can add additional wait time (useful for animations). A `wait_for` parameter accepts a CSS selector to wait for a specific element to appear.

### Viewport and Layout Control

Configure how the webpage is rendered before capture.

- **Viewport dimensions:** Specify width and height parameters in pixels. The default is 1920x1080 pixels.
- **Full page capture:** Set the `full_page` parameter to true to scroll through the entire webpage and capture the complete vertical content, not just the initial viewport.
- **Scale factor:** Control the device scale factor for retina/HiDPI screenshots.
- **Element capture:** Use the `element` parameter to capture a specific HTML element of the page. It accepts CSS selectors and the first matched element is captured.

### CSS and JavaScript Injection

CSS & JS injection is supported, allowing you to modify the appearance or behavior of a page before the screenshot is taken. This is useful for hiding elements, changing styles, or automating interactions on the page.

### Custom Headers and Cookies

Use the `headers` or `cookies` parameters to pass authentication tokens or session cookies to the target website. This enables capturing screenshots of pages that require authentication.

### Proxy Support

Use the `proxy` parameter to supply your own proxy. This is useful for bypassing bot protection on target websites or routing requests through specific locations.

### IP Geolocation

IP geolocation is available on enterprise plans, allowing screenshots to be captured as if browsing from a specific geographic location. This is useful for capturing region-specific content.

### Accept Language

Use the `accept_language` parameter to set the language of the target website you want to capture.

### Amazon S3 Export

ApiFlash provides built-in integration with Amazon S3 buckets to automatically save webpage screenshot files. This allows direct export of captured images to your own S3 storage.

### Caching Control

API calls made with the same parameters return a cached screenshot. A `fresh` parameter forces ApiFlash to create a new screenshot regardless of any cached versions.

### Cookie Banner Hiding

ApiFlash supports hiding cookie banners from captured screenshots automatically.

### Quota Monitoring

You can monitor quota usage via HTTP headers included in the response, or by calling a dedicated quota endpoint. The quota endpoint returns the total limit, remaining credits, and reset timing.

- **Endpoint:** `GET https://api.apiflash.com/v1/urltoimage/quota?access_key=YOUR_ACCESS_KEY`

### HTML Extraction

HTML extraction is available, allowing you to retrieve the HTML content of the target page alongside or instead of the screenshot.

## Events

The provider does not support events. ApiFlash is a stateless, request-response API for capturing screenshots and does not offer webhooks, event subscriptions, or any built-in polling mechanism.
