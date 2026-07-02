Now let me get the specific scopes available:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for CloudConvert

## Overview

CloudConvert is a file conversion service that supports over 200 file formats across audio, video, document, ebook, archive, image, spreadsheet, and presentation categories. It provides a REST API (v2) for programmatic file processing including conversion, optimization, watermarking, metadata extraction, website capture, and more. Processing is organized around jobs containing one or more tasks, with files imported from and exported to various storage providers.

## Authentication

CloudConvert supports two authentication methods:

### API Keys

To authenticate requests, you need to create an API key. API keys do not expire unless you revoke them. Requests are authenticated using the `Authorization: Bearer API_KEY` header.

API keys are created in the CloudConvert dashboard under **Authorization > API Keys**. When creating an API key you can select scopes to limit the access.

**Available Scopes:**

| Scope           | Description                                            |
| --------------- | ------------------------------------------------------ |
| `user.read`     | Read account data, remaining credits, and usage charts |
| `user.write`    | Update account data                                    |
| `task.read`     | Read tasks and jobs                                    |
| `task.write`    | Create, update, and delete tasks and jobs              |
| `webhook.read`  | Read webhook settings                                  |
| `webhook.write` | Update webhook settings                                |

### OAuth 2.0

CloudConvert supports OAuth 2.0's authorization code grant flow and implicit grant flow to issue access tokens on behalf of users. OAuth 2.0 clients are created in the dashboard.

- **Authorization URL:** `https://cloudconvert.com/oauth/authorize`
- **Token URL:** `https://cloudconvert.com/oauth/token`
- Client ID and Client Secret are obtained by registering your application in the CloudConvert Developer Console.
- The same scopes listed above apply to OAuth tokens.

### Base URLs

- **Production API:** `https://api.cloudconvert.com/v2`
- **Sandbox API:** `https://api.sandbox.cloudconvert.com` — the sandbox API allows to perform unlimited jobs and tasks without consuming your credits. It only processes a limited set of whitelisted files (by MD5 checksum).
- **Synchronous API:** `https://sync.api.cloudconvert.com/v2` (for waiting on task/job completion)

## Features

### File Conversion

CloudConvert supports nearly all audio, video, document, ebook, archive, image, spreadsheet, and presentation formats. Conversions are configured by specifying input format, output format, and format-specific options (e.g., page range, quality, password). For some tasks, there are multiple engines available (e.g., `office` or `libreoffice` for DOCX files), and the available options differ based on the used engine. You can also pin a specific engine version for reproducible results.

### File Optimization

Files can be optimized/compressed without changing their format. Supported for PDFs, PNGs, and JPGs.

### Watermarking

Add a watermark to a PDF file, to an image (PNG, JPG...) or to a video (MP4, MOV...). The watermark can be either a simple text or an image file. Configurable options include font, size, color, position, opacity, and rotation.

### Website Capture

Create a task to convert a website to PDF or to capture a screenshot of a website (PNG, JPG). Options include page format, headers/footers, device scale factor, and transparent background.

### Thumbnail Generation

Create a PNG, JPG, or WEBP thumbnail of one input file. Works with videos, documents, and images. Configurable width, height, fit mode, and timestamp (for videos).

### Merge Files

Merge multiple input files into a single PDF.

### PDF Operations

Dedicated operations for PDF-specific processing:

- Convert to PDF/A
- PDF OCR (optical character recognition)
- Encrypt and decrypt PDFs
- Split, extract, and rotate PDF pages

### Archive Creation

Create archives in formats such as ZIP, RAR, 7Z, TAR, TAR.GZ, or TAR.BZ2 from multiple input files.

### File Metadata

Extract metadata from files (e.g., page count, image/video resolution, author, etc.) or write/update metadata properties on files. Uses ExifTool under the hood.

### Custom Commands

Execute arbitrary FFmpeg, ImageMagick, and GraphicsMagick commands. It is also supported to use commands with multiple input files.

### File Import and Export

Files can be imported from and exported to multiple sources:

- **Import:** URL, direct upload, Base64, raw data, Amazon S3, Azure Blob Storage, Google Cloud Storage, OpenStack Swift, SFTP
- **Export:** Temporary URL, Amazon S3, Azure Blob Storage, Google Cloud Storage, OpenStack Swift, SFTP, HTTP PUT upload

### Jobs and Task Orchestration

The API uses the concept of Jobs and allows doing multiple operations with one single API call. For example, it is possible to convert the same file to multiple output formats, adding a watermark and creating a thumbnail with one single Job! Tasks within a job can reference each other's outputs, forming a processing pipeline.

### Signed URLs

Signed URLs allow triggering file conversions on demand using only URL query parameters, without needing to make authenticated API calls. Useful for client-side or on-the-fly conversion scenarios.

## Events

CloudConvert supports webhooks to notify your application about the status of jobs.

### Job Events

CloudConvert can notify your application about the status of jobs. You can create and manage your webhooks on the CloudConvert dashboard. Webhooks can also be created via the API or configured inline when creating a job.

Available webhook events:

- **`job.created`** — A job has been created.
- **`job.updated`** — A job has been updated (e.g., task progress).
- **`job.finished`** — A job has completed successfully.
- **`job.failed`** — A job has failed.

When subscribing, you specify the webhook URL and the list of events to listen to. Requests are cryptographically signed. If you receive a webhook, you should validate it to make sure it comes from CloudConvert. Each webhook has a unique signing secret. The signature is delivered in the `CloudConvert-Signature` header using HMAC SHA-256.
