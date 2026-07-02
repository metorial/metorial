# Slates Specification for Cloudinary

## Overview

Cloudinary is a cloud-based media management platform that provides APIs for uploading, storing, transforming, optimizing, and delivering images, videos, and other files. It offers an Admin API for asset management, an Upload API for ingesting media, and a Provisioning API for account-level management. Assets are delivered via a global CDN.

## Authentication

Cloudinary uses **HTTP Basic Authentication** over HTTPS for both its Admin API and Upload API. Three credentials are required:

- **Cloud Name**: Identifies your specific Cloudinary product environment. It is part of every API endpoint URL (e.g., `https://api.cloudinary.com/v1_1/{cloud_name}/...`). Safe to expose in client-side code.
- **API Key**: Used to identify your account. Safe to expose in client-side code.
- **API Secret**: Used for authentication. Must never be exposed in client-side code.

All three credentials can be found on the **API Keys** page of the Cloudinary Console Settings. Paid accounts can have multiple product environments, each with their own set of credentials.

**Basic Authentication** is the recommended method. You pass the API Key and API Secret either in the request URL or via an `Authorization` header:

```
Authorization: Basic base64(API_KEY:API_SECRET)
```

The endpoint format is:

```
https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/{action}
```

For EU or Asia Pacific data centers, the base URL changes to `https://api-eu.cloudinary.com/...` or `https://api-ap.cloudinary.com/...`.

**Signature-based authentication** is an alternative for the Upload API. You generate an SHA-1 or SHA-256 HMAC signature from the sorted request parameters and your API Secret, along with a Unix timestamp. This is primarily used for client-side uploads where you generate the signature server-side and pass it to the client.

**Unsigned uploads** are also supported for client-side upload scenarios using upload presets, but with a limited set of allowed parameters.

**Provisioning API** (Enterprise only) uses separate API keys and secrets from the standard ones, also authenticated via Basic Authentication.

## Features

### Asset Upload

Upload images, videos, raw files, and other media from various sources (local files, remote URLs, S3, base64 data). Supports configuring public IDs, folders, tags, metadata, access control, and applying incoming transformations at upload time. Upload presets allow pre-configuring upload parameters for reuse.

### Image and Video Transformations

Apply a comprehensive set of on-the-fly transformations via URL parameters, including resizing, cropping, format conversion, effects, overlays/watermarks, background removal, and generative AI features (generative fill, object removal, generative replace). Supports named transformations for reuse and conditional transformations.

### Media Optimization and Delivery

Automatic format selection (WebP, AVIF, JPEG XL, etc.) and quality optimization based on the requesting device and browser. Assets are delivered through a global CDN. Supports responsive images and adaptive bitrate streaming (HLS/MPEG-DASH) for video.

### Asset Management

Full CRUD operations on assets: list, update, delete, rename, and relate assets. Manage folders, tags, contextual metadata, and structured metadata fields. Supports backup and version management, and restoring previous asset versions.

### Search

A powerful Search API that lets you find assets using search expressions across various fields including tags, metadata, format, size, dates, and more. Supports AI-powered Visual and Natural Language Search for finding images by description or using another image as reference (Enterprise only).

### AI and Analysis

Built-in and add-on AI capabilities including auto-tagging, content analysis, OCR text extraction, facial detection, image quality analysis, accessibility analysis, and content moderation (manual and AI-based via add-ons like Amazon Rekognition and WebPurify).

### Media Access Control

Control access to delivered assets via signed delivery URLs, token-based authentication (IP restrictions, time-limited URLs), and cookie-based authentication. Supports strict transformations mode to prevent unauthorized transformation generation.

### Video Features

Video-specific capabilities including trimming, concatenation, adaptive bitrate streaming, video transcription, video analytics, and live streaming. Includes an embeddable Video Player widget with customization options.

### Account and User Provisioning

The Provisioning API (Enterprise) allows managing product environments, users, user groups, and API keys programmatically. Supports SAML SSO for user authentication.

### Programmatic Asset Creation

Generate new assets programmatically including animated images/GIFs, ZIP archives, sprites, image collages, PDF files from images, and text-to-image generation.

## Events

Cloudinary supports webhook notifications that send HTTP POST requests to configured URLs when certain events occur.

### Upload Events

Notifications sent when an asset upload completes, including all details about the uploaded asset. Supports per-request notification URLs via the `notification_url` parameter and separate eager transformation completion notifications via `eager_notification_url`.

### Asset Modification Events

Notifications for asset changes including:

- **Rename**: When an asset's public ID is changed.
- **Delete**: When an asset is deleted.
- **Display name change**: When an asset's display name is updated.
- **Move**: When an asset is moved between folders.
- **Tags**: When tags are added or removed from an asset.
- **Context metadata**: When contextual metadata is added, updated, or removed.
- **Structured metadata**: When structured metadata is added, updated, or removed.
- **Access control**: When an asset's access control settings are updated.
- **Related assets**: When asset relationships are added or removed.
- **Version restore**: When a previous asset version is restored.

### Folder Events

Notifications when asset folders are created or deleted.

### Moderation Events

Notifications when moderation status changes on an asset (manual or AI-based moderation results).

### Eager Transformation Events

Notifications when asynchronous eager transformations complete, including the status and URLs of the generated derived assets.

### Explode Events

Notification when all derived assets from an explode operation (e.g., multi-page PDF to individual images) have been generated.

### Multi/Archive Generation Events

Notifications when multi-image or archive generation operations complete.

### Creative Approval Events

Notifications when the status of a proof changes during the creative approval flow (Enterprise/DAM feature).

### Configuration

- Global notification URLs can be configured in the Console Settings or programmatically via the Admin API's triggers method.
- Up to 30 notification URLs per product environment, each assignable to specific event types.
- Per-request notification URLs can override or supplement global URLs.
- All notifications include `X-Cld-Signature` and `X-Cld-Timestamp` headers for signature verification using your API Secret.
