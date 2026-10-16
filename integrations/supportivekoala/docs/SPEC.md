# Supportivekoala Specification

## Overview

Supportivekoala is a platform that automates image generation using customizable templates. Users can design reusable templates and programmatically generate images by populating them with dynamic parameters (text, images, etc.) via API. Generated images can be exported in PNG, JPEG, or WebP formats.

## Authentication

Supportivekoala uses API keys to authenticate requests. The API key is used as a Bearer token in the `Authorization` header.

- Supply the API key from your existing Supportivekoala account.
- All authenticated requests must include the header: `Authorization: Bearer <your_api_key>`.
- Base URL: `https://api.supportivekoala.com`

No OAuth or scopes are involved. A single API key is sufficient for all operations.

## Features

### Template Management

Create and manage reusable image templates that define the visual layout and configurable parameters for generated images.

- Templates have a **name**, configurable **width** and **height** (default 1000×1000), and a list of **params** that define what dynamic content can be injected.
- Templates can be created, updated, retrieved individually, or listed.

### Image Generation

Create images based on a template. This is the core feature — you provide a template ID and a set of parameters, and Supportivekoala generates an image with those values applied.

- **template** (required): The ID of the template to use.
- **params** (optional): Key-value pairs that populate the template's dynamic fields (e.g., text content, image URLs).
- **format** (optional): Output format — `png` (default), `jpeg`, or `webp`.
- Generated images are hosted on Supportivekoala's cloud and returned with a URL. Generation and individual retrieval also prepare a download from the provider-issued HTTPS URL when usable. This does not confirm later download availability. No image regeneration is performed to retry a download, and no expiry or retention period is assumed. If a provider-returned URL exposes the account API key, it is withheld. A successful generation is reported as successful and must not be repeated solely to retry downloading.

### Image Retrieval

Retrieve previously generated images, either individually by ID or as a full list of all images associated with your account. Each image record includes the template used, the hosted image URL, and timestamps.

## API verification

The existing API surface uses `/v1/templates` and `/v1/images`, with ID-based retrieval and a POST update for templates. The original parameter shapes, image formats, output fields, and defaults are retained for existing connections. Current provider documentation was unavailable during the October 2026 audit, so route support, template defaults, and file retention remain unverified. No new API operations or event support are claimed.
