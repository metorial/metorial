# Abyssale Integration Specification

## Overview

Abyssale is a creative automation platform that allows users to programmatically generate visual content (images, videos, PDFs, GIFs, and HTML5 banners) from pre-designed templates. It provides a REST API and dynamic image URLs for scaling visual production across multiple formats and sizes.

## Authentication

Abyssale uses API Key Authentication: your API key is passed along with every API call, allowing Abyssale to identify your company account and access your data.

To obtain an API key:

1. Go to app.abyssale.com and log in.
2. Click Workspace settings on the left menu.
3. Click API Key on the left menu.
4. Click the green "Create new API key" button.

Access to the API key requires at least an Admin role.

All Abyssale requests must contain an `x-api-key` header with your API Key.

Connection validation uses `POST /auth`, which verifies the key and returns its workspace name. `GET /ready` is an unauthenticated health check and cannot validate a key. The `get_workspace` tool exposes the actual workspace name without inventing a user or account ID.

The workspace plan must include API access. Invalid or revoked keys and plans without API access fail authentication.

## Features

### Design Management

Retrieve and inspect designs (templates) in your workspace. All designs are listed in different project pages and are accessible via API. You can retrieve all designs (with id, name, creation/update dates) or retrieve details of a specific design including its formats, elements, and properties.

### Synchronous Single Image Generation

Generate a single image from a design template synchronously. The image is created and the related image URL is sent back synchronously in the API response. You provide element overrides (text, colors, images) and a specific format. Best for on-demand, single-asset generation where low latency is needed.

### Asynchronous Multi-Format Generation

Generate multiple formats of an image/video/pdf at once from a design. This method is asynchronous and allows generating several media (images/videos/pdf/gif) with one API call. Supported design types include static, animated, print, and multi-page print. You can specify which format IDs to generate or omit them to generate all formats defined in the template. Results are delivered via webhook callback or polling.

- **Multi-Format Images** (JPEG, PNG, Web PDF)
- **Multi-Format Videos**
- **Multi-Format Animated GIFs**
- **Multi-Format PDFs for Printing**
- **Multi-Page PDF for Printing** — Generate multiple page PDFs designed in Abyssale. This method is asynchronous.
- **HTML5 Banner Ads**

### Dynamic Image URLs

Create a dynamic image URL for a given design. Only one dynamic image is allowed per design; subsequent calls return the existing dynamic image. Dynamic images allow real-time customization of visuals via URL parameters without making generation API calls. Useful for personalized email images, Open Graph images, etc.

### Image Export

Export one or multiple previously generated visuals as a downloadable ZIP file. A callback URL can be provided to receive a notification when the export is ready.

### Element Customization

All elements have their own properties that can be customized (color, text payload, image, etc.). When generating visuals, you pass element overrides as a dictionary keyed by layer name. Supported element types include text, images, shapes, backgrounds, and more.

### Font Management

Search available fonts by name, category, weight, style, and source.

### Project and Workspace Template Management

List and manage projects and workspace templates programmatically.

### AI-Powered Features

Asynchronous image element overrides support documented AI properties such as text-to-image and background removal. AI usage consumes the workspace AI credit balance. Synchronous text-to-image is unsupported; synchronous background removal is deprecated by the provider.

## Events

Abyssale supports webhooks for receiving notifications about generation and workflow events. All events are delivered via an HTTP POST request (HTTPS only) with the application/json content type. Webhooks are configured globally via the Abyssale dashboard or per-request via a `callback_url` parameter.

### Banner Generation (NEW_BANNER)

A new banner has been generated. It can be filtered by template. When a banner is generated synchronously from an API call, this event won't be triggered. The payload includes the file URL, format dimensions, and template details.

### Batch Generation Completed (NEW_BANNER_BATCH)

Triggered when an asynchronous batch generation request has completed. The payload includes all successfully generated assets and any errors for formats that failed. This is the primary event for tracking async multi-format generation jobs.

### Export Completed (NEW_EXPORT)

Triggered when a design export (e.g., a ZIP file of multiple banners) has finished processing and is available for download.

### Design Status Updated (TEMPLATE_STATUS)

Triggered when the workflow/approval status on a design is updated (e.g., changed to APPROVED, REJECTED, etc.). Useful for integrating approval workflows into external systems.

## Available Workflows

- Discover workspace identity and generation/AI credit balances.
- Search, sort, and optionally page designs; search and optionally page fonts and projects. Omitting page and perPage retains the provider's original all-results behavior.
- Inspect whole designs, including multipage content and optional advanced group layers.
- Discover workspace templates and their categories, then duplicate a template into a discovered project.
- Generate static images, animated GIF/MP4/HTML5 output, and print PDFs with documented format, compression, frame-rate, loop, and print settings.
- Generate multipage PDFs with per-page layer overrides.
- Retrieve generation status and generated files with complete original provider metadata and downloadable results.

Existing URL output fields remain available whenever the provider returns them. HTML5 ZIP output has no CDN URL; multipage PDFs have no format name. Optional metadata is omitted when absent from the provider response rather than synthesized. Export ZIP delivery remains asynchronous via the caller's callback URL. Dynamic images are static-design only. No automatic webhook registration or event triggers are provided by this integration.

## Official References

- [API reference](https://developers.abyssale.com/api-reference/)
- [Machine-readable API contract](https://developers.abyssale.com/api.yaml)
- [Authentication](https://developers.abyssale.com/rest-api/authentication)
- [Generation](https://developers.abyssale.com/rest-api/generation/)
