# Slates Specification for Cloudlayer

## Overview

Cloudlayer (cloudlayer.io) is a service for automating document generation processes using PDF Generation and Image Generation services. Using its API, you can generate rich documents such as PDFs or images from HTML or a URL. It offers an extensive library of templates and supports custom templates using Nunjucks templating syntax.

## Authentication

Cloudlayer authenticates API requests using account API keys. If you don't include your key when making an API request or use an incorrect one, a 401 Unauthorized response gets returned.

To obtain your API Key, you will need to log into your account. Go to the API Management tab, and by default, a single API Key gets generated for you. Up to 5 API Keys are allowed at any given time.

The API Key needs to be added to the header of each request. The name of the header is `X-API-Key` and the value will be the key which begins with `cl-`.

Example:

```
X-API-Key: cl-your-api-key-here
```

The base URL for the API is `https://api.cloudlayer.io/v2/`.

## Features

### PDF Generation from HTML

Convert HTML content into PDF documents. The HTML to PDF endpoint allows you to convert HTML to PDF files. The HTML can include Javascript, CSS, Imported Fonts, Embedded images, External images, or other external resources. The HTML must be provided as a base64-encoded string.

- Configurable paper format (A4, Letter, etc.), dimensions, margins, and orientation (portrait/landscape).
- Support for custom headers and footers.
- Options for page ranges, background graphics printing, and CSS @page declarations.

### PDF Generation from URL

The PDF Generation service can take any publicly accessible URL and capture it to generate a PDF document from its source. This feature is particularly useful for converting dashboards or web pages into PDF documents. The service supports session cookies and basic authentication if your URL requires authentication.

- Supports batch processing: an array of URLs can be converted to PDF and combined into a single PDF file.
- Same paper format, margin, header/footer, and orientation options as HTML-to-PDF.

### Image Generation from HTML

Take any HTML and convert it into an image. It can include JavaScript, CSS, custom font imports, image imports, etc. As long as it works in Chrome, the service will render it.

- Configurable viewport width and height, device scale factor (DPR).
- Output formats include PNG, JPG, and WebP.
- Support for transparent backgrounds (for formats that support transparency).

### Image Generation from URL

Any URL accessible on the public web can be captured and turned into an image. This is useful for converting dashboards into image documents to send out to customers or management.

- Same viewport and output format options as HTML-to-image.
- Supports authentication via cookies or basic auth on the target URL.

### Template-Based Generation (PDF and Image)

Two template types are available: predefined templates from the gallery, and custom templates.

- **Predefined templates**: Browse pre-defined templates in the PDF or Image template gallery. Pass in the `templateId` and your data, and the service handles the rest.
- **Custom templates**: Create your own templates using the Nunjucks syntax and pass in your data. Templates are provided as base64-encoded strings.
- Extended Nunjucks functions offer multicultural support for currencies, dates, and number formatting.
- Templates that support auto-calculations can be toggled via the `__auto_calculate` field in the data.

### Asset Storage and CDN

Generated assets are stored in your account's cloud storage by default. These assets are cached in the CDN and available for public access using a Public CDN URL. There are no bandwidth or additional costs associated with using assets via the CDN URL.

- User Storage lets users bring their own storage. Any S3-compatible storage can be used, and all assets will be processed and uploaded to your storage.
- Storage can be explicitly disabled to receive the asset directly in the response.

### Preview Generation

The service can generate an image preview (thumbnail) of the image or first page of the PDF document. Storage must be enabled.

- Configurable width, height, image type (e.g., WebP), quality (0–100), and aspect ratio options.

### Job Management

Jobs API allows listing your jobs and viewing jobs by ID using the API.

- V1 API calls are synchronous by default. V2 API calls are asynchronous by default.

### Account Status

The API provides a status endpoint (`/v2/getStatus`) to check your account's remaining credits and rate limit information without consuming API credits.

## Events

Cloudlayer supports webhooks for job completion notifications.

### Job Status Webhooks

A webhook is an external URL endpoint that can be sent data when a job's status has changed to success or error. Webhooks are especially useful when using async calls — you can send many async calls and then have your external service receive the webhook calls. All webhook calls follow the exact same format of the job response.

- Every API request can include a `webhook` parameter with the URL where the completed response will be sent upon completion. This URL must be an HTTPS endpoint and publicly accessible via the internet.
- Webhooks fire when a job reaches either a `success` or `error` status.
