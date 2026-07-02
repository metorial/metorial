# Slates Specification for Supportivekoala

## Overview

Supportivekoala is a platform that automates image generation using customizable templates. Users can design reusable templates and programmatically generate images by populating them with dynamic parameters (text, images, etc.) via API. Generated images can be exported in PNG, JPEG, or WebP formats.

## Authentication

Supportivekoala uses API keys to authenticate requests. The API key is used as a Bearer token in the `Authorization` header.

- You can view and manage your API keys in the profile page at `https://supportivekoala.com/app/profile`.
- Alternatively, you can register an account via the API by sending a POST request to `https://api.supportivekoala.com/v1/auth/register` with your email and password, which returns an API key.
- All authenticated requests must include the header: `Authorization: Bearer <your_api_key>`.
- Base URL: `https://api.supportivekoala.com`

No OAuth or scopes are involved. A single API key is sufficient for all operations.

## Features

### Template Management

Create and manage reusable image templates that define the visual layout and configurable parameters for generated images.

- Templates have a **name**, configurable **width** and **height** (default 1000×1000), and a list of **params** that define what dynamic content can be injected.
- Templates can be created, updated, retrieved individually, or listed.
- Public templates are also available for use from Supportivekoala's template gallery.

### Image Generation

Create images based on a template. This is the core feature — you provide a template ID and a set of parameters, and Supportivekoala generates an image with those values applied.

- **template** (required): The ID of the template to use.
- **params** (optional): Key-value pairs that populate the template's dynamic fields (e.g., text content, image URLs).
- **format** (optional): Output format — `png` (default), `jpeg`, or `webp`.
- Generated images are hosted on Supportivekoala's cloud and returned with a URL.

### Image Retrieval

Retrieve previously generated images, either individually by ID or as a full list of all images associated with your account. Each image record includes the template used, the hosted image URL, and timestamps.

## Events

The provider does not support events.
