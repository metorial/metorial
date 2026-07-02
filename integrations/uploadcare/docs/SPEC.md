Now let me get more details on the add-ons and URL API features:# Slates Specification for Uploadcare

## Overview

Uploadcare is a cloud-based file handling platform that provides APIs for uploading, storing, processing, and delivering files via a global CDN. It offers access to files and their metadata, application data, file groups, add-ons, projects, webhooks, document conversion and video encoding. Its URL API lets you instantly process images stored on Uploadcare by using chainable URL operations.

## Authentication

Uploadcare uses API key-based authentication with a **Public Key** and **Secret Key** pair, which are assigned per project. There are two authentication schemes for the REST API:

### 1. Uploadcare.Simple (Testing only)

For quick tests: `Uploadcare.Simple`, a simple scheme where your Secret API Key is specified in every request's auth-param. With this method, auth-param is your `public_key:secret_key` pair, and your project secret_key is included in every request as plain text.

**Header format:**

```
Authorization: Uploadcare.Simple YOUR_PUBLIC_KEY:YOUR_SECRET_KEY
```

This method is not recommended for production.

### 2. Uploadcare (Signature-based, recommended for production)

For production: `Uploadcare`, a scheme where a signature, not your Secret API Key, is specified. The auth-param is a `public_key:signature` pair, where your secret_key is used to derive signature but is not included in every request itself. You must also provide the `Date` header in RFC2822 format with the time zone set to GMT.

The signature must be constructed from specific request components, concatenated using LF line separators, and signed with HMAC/SHA1 using the project's secret_key.

**Header format:**

```
Accept: application/vnd.uploadcare-v0.7+json
Date: Fri, 30 Sep 2016 11:10:54 GMT
Authorization: Uploadcare YOUR_PUBLIC_KEY:SIGNATURE
```

### Upload API Authentication

The Upload API provides several ways of uploading files and its root is located at `https://upload.uploadcare.com/`. The Upload API requires only the **Public Key** for standard uploads. For enhanced security, **Signed Uploads** can be enabled, which prevents uploading files using a Public API key only — you'll have to generate a security token on the backend to upload a file.

**Credentials required:**

- **Public Key** — identifies the project, used in Upload API and as part of REST API auth.
- **Secret Key** — used to sign REST API requests and generate upload signatures.

Both keys are available in the Uploadcare Dashboard under your project settings.

## Features

### File Uploading

Upload files to Uploadcare storage through multiple methods. Supports direct uploading, multipart uploading, uploading via URL, and signed uploads. Direct file uploads support files smaller than 100 megabytes only. For larger files, multipart uploads should be used instead. Uploadcare can also fetch a file from a publicly available URL and automatically upload the fetched file to your project.

### File Management

Uploadcare provides methods for managing already uploaded files with its REST API. You can organize files by tagging them, creating new file versions, making decisions based on file info, and running heavy tasks in the background.

- List, retrieve, store, copy, and delete files.
- When a file is stored, it is available permanently. If not stored, it will only be available for 24 hours.
- Arbitrary metadata can be attached to files for custom tagging and organization.

### File Groups

Files can be organized into immutable groups. Groups are identified similarly to individual files — a group ID consists of a UUID followed by a "~" character and a group size (the number of files in the group). Groups are immutable and the only way to add/remove a file is to create a new one.

### Image Processing (URL API)

The URL API lets you instantly process images stored on Uploadcare by using chainable URL operations. You can adjust each piece of image right before it's delivered. Available operations include resizing, cropping, smart cropping, color adjustments, filters, blur/sharpen, overlays, rotation, face detection, background removal, format conversion, and compression optimization.

- Processing is on-the-fly and results are cached on the CDN.
- Only originally uploaded files take up storage space — derivatives made with URL API are cached directly on the CDN.

### Video Processing

Video files can be encoded from popular formats to MP4, WEBM, and OGG. You can adjust quality, dimensions, cut out sections, generate thumbnails and more. Video processing requires starting a job via the REST API.

### Document Conversion

Uploadcare allows document conversion to target formats including DOC, DOCX, XLS, XLSX, ODT, ODS, RTF, TXT, PDF, JPG, PNG. Input file formats supported include DOC, DOCX, XLS, XLSX, PPS, PPSX, PPT, PPTX, VSD, VSDX, and many more. Conversion is asynchronous — you start a job and check its status.

### Add-Ons

An Add-On is an application implemented by Uploadcare that accepts uploaded files as an input and can produce other files and/or appdata as output. Available add-ons include:

- **AWS Rekognition** — object and scene detection in images, plus content moderation.
- **ClamAV** — virus checking for uploaded files.
- **Remove.bg** — automated background removal from images.

Add-on execution is asynchronous — you start an execution and poll for its status.

### CDN Delivery and Proxy

Once uploaded, files become available via the Uploadcare CDN. The CDN includes on-the-fly image processing features and can work as a proxy. You can use Uploadcare CDN with your existing assets — just add a prefix to the URLs and your files will be distributed from the CDN.

### Project Management

Retrieve information about your Uploadcare project via the REST API. Each file belongs to a project — an isolated environment with its own API keys and settings. Projects are separate environments with unique sets of API keys, dedicated storage, and settings.

### Security Features

- **Signed uploads** — control who and when can upload files, preventing uploads using a Public API key alone.
- **Signed URLs** — control who and when can access files. When enabled, a user requires a token to access content.
- **Content moderation** — detect unsafe or inappropriate content via AWS Rekognition Moderation add-on.
- **Malware protection** — scan uploaded files for viruses using ClamAV.

## Events

Uploadcare uses webhooks to notify your application about certain events that occur in your project asynchronously. Webhook requests can optionally be signed using a signing secret key for verification.

Webhooks can be managed via the REST API or the Dashboard. The same webhook endpoint can be added multiple times to receive notifications about different events, and multiple different endpoints can be added for the same event type.

### file.uploaded

Triggered when a new file is added to the project, enabling immediate actions or responses.

### file.infected

Triggered when a file is identified as infected through automatic scans of new uploads or manual checks on existing files.

### file.stored

Triggered when a file is successfully stored, enabling you to implement subsequent actions such as sending user notifications or updating databases.

### file.deleted

Triggered when a file is removed, ensuring databases stay synchronized and preventing user access to files that no longer exist.

### file.info_updated

Triggered for any file metadata or appdata changes.

Each webhook payload includes an `initiator` field that identifies the source or cause of the event that triggered the webhook, containing type and detail. This is useful for distinguishing whether a file was uploaded directly or produced by an add-on like background removal.
