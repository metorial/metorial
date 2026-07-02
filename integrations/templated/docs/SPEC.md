Now let me check for webhooks or event support and look at the full API docs for more features.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Templated

## Overview

Templated (templated.io) is an API service for automated generation of images, videos, and PDFs from reusable templates. Users design templates in a drag-and-drop editor (or import from Canva), then programmatically render variations by modifying text, images, and other layers via API calls. It also offers an embeddable white-label editor for end-user template editing.

## Authentication

Templated uses API keys to allow access to the API. Once logged in, you can find your API key in the API Integration tab of your dashboard. This API key will give you full access to all API endpoints.

API authentication is done using an API key that you can find in your Templated dashboard. Simply include your API key in the request header as `Authorization: Bearer YOUR_API_KEY`.

There are no OAuth flows, scopes, or additional credentials required. A single API key provides full access to all API functionality.

**Base URL:** `https://api.templated.io/v1/`

## Features

### Render Generation

Create rendered outputs (images, videos, or PDFs) from templates by specifying layer modifications such as text content, colors, fonts, and image URLs. A render is the generated output of a template. It can be an image, video, or PDF. By default, renders are generated synchronously and take around 2 seconds to complete (videos may take longer depending on duration and complexity).

- Supports text layers (text, color, background, font size) and image layers (image URL).
- Multi-page templates are supported using the `pages` parameter to specify different layer modifications for each page. Multi-page templates are ideal for creating carousels or PDF documents with multiple pages.
- Pages can be merged into a single PDF output.
- Templated supports rendering templates as MP4 videos. This is ideal for templates with animations, video layers, or when you want to create dynamic video content from your designs.
- You can add entrance, looping, and exit animations to any layer via the animation property. Animations only apply to video (MP4) renders.
- Renders can be retrieved, listed, deleted, duplicated, and merged.

### Template Management

Create, retrieve, update, duplicate, clone, and delete templates. Templates can be organized with tags and filtered by name, dimensions, tags, or external ID.

- Create your template in our editor, import from Canva or select one from our Template Gallery.
- Templates can be created programmatically via the API.
- List and inspect template layers and pages.
- Browse gallery templates for pre-made designs.
- Tag management: add, remove, and update tags on templates.

### Folder Organization

Organize templates and renders into folders. Folders can be created, updated, and deleted. Templates and renders can be moved between folders, and folder contents can be listed.

### Image Uploads

Upload images to use in templates and renders. Uploads support optional tags for organization and an external ID to link with your own system. Uploaded images can be listed and deleted.

### Custom Font Management

Upload custom fonts (TTF, OTF, WOFF, WOFF2) for use in templates. Fonts can be listed and deleted.

### Embeddable Editor

White-label the editor by embedding it in your site or app with a single line of code, letting your users design their own templates.

- Customize colors, logo, and interface elements to match your brand identity. Control what users can do: save, download, or modify templates.
- Supports passing custom metadata and pre-populating layer data via URL parameters.
- Supports launching the editor with an existing template or render for editing.
- Available in preview mode and form mode for different use cases.

### Account Information

Retrieve account details including email, name, current API usage, quota, and plan information.

## Events

Templated supports webhooks specifically for the **embedded editor**. When a user performs an action in the embedded editor, Templated sends a POST request to a configured webhook URL. The webhook URL is configured in the embed configuration settings.

**Note:** These webhooks are only triggered by user actions within the embedded editor, not by API calls.

### Create Event

Triggered when a user creates a new template in the embedded editor. The payload includes the template ID and any custom metadata passed from the embedding application.

### Save Event

Triggered when a user saves a template in the embedded editor. The payload includes the template ID and any custom metadata.

### Download Event

Triggered when a user downloads a template from the embedded editor. The payload includes the template ID and any custom metadata.
