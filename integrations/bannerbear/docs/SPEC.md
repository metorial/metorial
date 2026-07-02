# Slates Specification for Bannerbear

## Overview

Bannerbear is a media generation service that auto-generates images, videos, animated GIFs, PDFs, and screenshots from reusable design templates via API. Users design templates in the Bannerbear editor, and the API allows programmatic generation of media by applying text, image, color, and other modifications to those templates.

## Authentication

Bannerbear uses API keys for authentication. You can get an API key by creating a project in Bannerbear. The API key must be included in all requests via an `Authorization` header:

```
Authorization: Bearer API_KEY
```

There are two types of API keys:

- **Project API Key**: This key enables you to interact with a specific project via API. You can find it in your Project → Settings page. All requests made with this key are scoped to that project.

- **Master API Key**: You can optionally create a Master API Key which allows higher-level access at the account level. There are two levels: Limited Access (create and list Projects) and Full Access (create and list Projects as well as interact with any Project). When using a Full Access Master API Key to interact with a Project, you must add a `project_id` parameter to your payload.

No OAuth or additional scopes are involved. Authentication is purely key-based.

## Features

### Image Generation

Generate images from design templates by providing a template ID and a list of modifications (text, images, colors, fonts, effects, etc.). Bannerbear responds with JPG and PNG (and PDF, if requested) formats of the generated image. Modifications can target individual named layers in the template, supporting text containers, image containers, QR codes, bar codes, star ratings, and chart data. Supports transparent backgrounds and on-the-fly font changes.

### Video Generation

Generate videos from video templates. Three build packs are supported: **Overlay** (static graphic overlay on a video), **Transcribe** (auto-transcribed subtitles on a video), and **Multi Overlay** (slideshow-style overlays displayed consecutively on a video). Supports trimming, zoom/pan effects, blur filters, input from external video/audio/image URLs, and optional approval workflows for transcriptions before rendering.

### Collections (Multi-Image Generation)

Generate multiple images from a single data payload by grouping templates into a **Template Set**. One API call with shared modifications produces images across all templates in the set simultaneously.

### Animated GIF Generation

Create slideshow-style animated GIFs by providing multiple frames of modifications against a single template. Configurable frame rate, per-frame durations, looping, and optional input video for auto-generating frame thumbnails. Maximum of 30 frames.

### Movie Composition

Combine up to 10 video clips (or still images) into a single MP4 file with optional transitions (fade, pixelize, slide variations) and soundtrack overlays. Useful for assembling intro/content/outro sequences from dynamically generated video clips.

### Screenshot Capture

Capture screenshots of public web pages by providing a URL. Configurable browser width, height, mobile user agent, and language settings.

### Template Management

Create, duplicate, retrieve, update, delete, and import templates via API. Templates can be imported from Bannerbear's public library or from shared templates. Templates can be tagged and filtered by tag or name.

### Template Editor Sessions

Provide end users with secure, time-limited access to the Bannerbear template editor. Sessions can be created in default, limited (no adding/deleting layers), or preview (read-only) mode. Useful for embedding template editing into your own product.

### Signed URLs (On-Demand Image Generation)

Generate images on-demand via encrypted URL parameters without making a standard API call. You create a Signed Base for a template, then append encoded modification parameters to the URL to generate images synchronously when the URL is requested.

### PDF Utilities

- **Join PDFs**: Combine multiple PDF files into a single PDF.
- **Rasterize PDFs**: Convert a PDF into flat JPG/PNG images with configurable DPI (up to 300), useful for print-quality output.

### Diagnostics

Run diagnostic reports on generated images to identify issues with external media loading (e.g., missing images, permission errors, format issues).

### Project Management

Create, retrieve, list, and hydrate (copy templates between) projects. Requires a Master API Key.

## Events

Bannerbear supports webhooks in two ways:

1. **Per-request webhooks**: Pass a `webhook_url` parameter when generating any media (image, video, collection, animated GIF, movie, screenshot, PDF operations). The completed object is POSTed to that URL when rendering finishes.

2. **Project-level event webhooks**: Register persistent webhooks at the project level that fire for all events of a specific type within the project. These can be managed via the API or project settings.

### Supported Event Types

- **template_created**: Fires when a new template is created in the project.
- **template_edited**: Fires when an existing template is edited.
- **image_created**: Fires when an image has been generated.
- **collection_created**: Fires when a collection (multi-image set) has been generated.
- **video_created**: Fires when a video has been generated.
- **animated_gif_created**: Fires when an animated GIF has been generated.
- **movie_created**: Fires when a movie has been generated.
- **screenshot_created**: Fires when a screenshot has been captured.

Each project-level webhook is configured with a URL and a single event type. Multiple webhooks can be registered for different event types. The webhook payload contains the full object data for the corresponding resource.
