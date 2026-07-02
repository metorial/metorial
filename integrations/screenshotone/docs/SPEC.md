# Slates Specification for ScreenshotOne

## Overview

ScreenshotOne is a screenshot rendering API that captures website screenshots, renders HTML/Markdown to images or PDFs, and extracts page metadata. It renders screenshots with a single API call, eliminating the need to manage browser clusters and handle various corner cases. It supports rendering in a variety of image formats including PNG, JPEG, WebP, GIF, and more.

## Authentication

ScreenshotOne uses API keys for authentication. Sign up to get an access key and a secret key.

- **Access Key**: Each request must have an access key to authenticate the API user. You can find it on the access page. This access key should be included in the API requests as a query parameter, in the JSON body for POST requests, or as a header `X-Access-Key`.
- **Secret Key (Signing Key)**: Used for generating signed requests. A signature is optional. It is used for signed requests. Do not use the secret (signing) key as a signature. A signature is a complex parameter that is a hash of all screenshot parameters with a signing key. You can force signing all requests on the access page.

**Base URL**: `https://api.screenshotone.com/`

**Example request**:

```
GET https://api.screenshotone.com/take?url=https://example.com&access_key=<your_access_key>
```

## Features

### Screenshot Capture from URL

Capture screenshots of any publicly accessible web page by providing a URL. Supports authenticated pages via custom headers, authorization tokens, or cookies.

- **Output formats**: PNG, JPEG, WebP, GIF, JP2, TIFF, AVIF, HEIF, PDF, HTML, Markdown.
- **Full-page screenshots**: Automatically scrolls and triggers lazy-loaded content.
- **Element-level capture**: Use CSS selectors to screenshot specific elements, or clip coordinates to capture a region.

### HTML and Markdown Rendering

Render arbitrary HTML or Markdown content as images or PDFs without needing a hosted page.

- One of `url`, `html`, or `markdown` must be provided per request.

### PDF Generation

Render web pages, HTML, or Markdown as PDF documents.

- Configurable paper format (A0–A6, letter, legal, tabloid), orientation (landscape/portrait), margins, and background printing.
- Option to fit the entire page onto a single PDF page.

### Animated/Scrolling Screenshots

Capture animated GIF screenshots that show scrolling behavior on a page.

### Viewport and Device Emulation

Simulate different devices and screen configurations when rendering.

- Pre-built device presets (e.g., iPhone, Galaxy) that set viewport dimensions, scale factor, user agent, and touch support.
- Custom viewport width, height, device scale factor (1–5), mobile mode, and landscape orientation.

### Content Blocking

Produce clean screenshots by automatically removing unwanted page elements.

- Block cookie/GDPR banners (rule-based and heuristic-based), ads, chat widgets (Crisp, Intercom, Drift, etc.), and trackers.
- Block specific requests by URL pattern or block resource types (scripts, images, stylesheets, etc.).

### Page Customization

Modify the page before capturing.

- Inject custom JavaScript and CSS.
- Click or hover on elements by CSS selector before capture.
- Hide elements by CSS selector.

### Emulation Options

Control rendering environment preferences.

- Dark mode and light mode rendering.
- Reduced motion preference.
- Print vs. screen media type.
- Custom geolocation (latitude, longitude, accuracy).
- Time zone selection.

### Proxy and Geo-targeting

Route screenshot requests through proxies for location-specific rendering.

- Built-in data center proxies from 18+ countries via `ip_country_code`.
- Support for custom HTTP proxies.

### Caching

Cache rendered screenshots on ScreenshotOne's CDN (Cloudflare) to avoid redundant renders.

- Configurable TTL (4 hours to 1 month).
- Cache key customization for multiple cached versions of the same request.
- Cached screenshots are not counted against quota.

### S3 Storage Upload

You can use ScreenshotOne to take website screenshots and upload them directly to Amazon S3 and any other S3-compatible storage like Cloudflare R2, Backblaze, and others.

- Configure storage credentials per-request or via the dashboard.
- Specify storage path, bucket, storage class, and ACL.

### Metadata Extraction

Extract various metadata from the target page alongside the screenshot.

- Image dimensions, fonts used, favicon, Open Graph tags, page title.
- Page content as HTML or Markdown (uploaded to temporary CDN storage).
- HTTP response status code and headers from the target site.

### OpenAI Vision Integration

ScreenshotOne supports direct integration with OpenAI vision, so you can get a screenshot and generate vision prompt completion in one simple API call with no additional cost.

- Provide your own OpenAI API key, a vision prompt, and max tokens.

### Async Execution

You can literally execute any request asynchronously by setting the async option to true.

- Combine with webhooks and S3 storage for background processing workflows.

### Usage Tracking

Query current API usage programmatically via a dedicated usage endpoint.

## Events

ScreenshotOne supports webhooks for receiving results of asynchronous screenshot operations.

### Screenshot Completion Webhook

You can receive the result of the screenshot execution at your desired URL. To do it, specify the `webhook_url` parameter.

- The webhook delivers the rendered screenshot (binary or JSON with `screenshot_url` or S3 `store.location`).
- To ensure that ScreenshotOne sent the request, you should get the signature from the `X-ScreenshotOne-Signature` header and verify it with your secret key from the access page by applying the HMAC SHA-256 algorithm.
- Webhook signing can be disabled with `webhook_sign=false` for performance.
- Enable `webhook_errors=true` to receive error details in the webhook payload.
- Use `external_identifier` to correlate webhook responses with your own request tracking.
