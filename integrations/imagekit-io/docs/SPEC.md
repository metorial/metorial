Now let me get the complete list of webhook events:Now I have all the information needed. Let me compile the specification.

# Slates Specification for ImageKit

## Overview

ImageKit is a cloud-based image and video optimization, transformation, and delivery platform with an integrated Digital Asset Management (DAM) system. It provides real-time URL-based media processing, a CDN for delivery, and APIs for file upload, management, metadata, and cache operations. It can connect to external storage providers like AWS S3, Google Cloud Storage, and Azure Blob Storage.

## Authentication

ImageKit authenticates API requests using API keys. Authentication to the API is performed via HTTP Basic Auth. Provide your private API key as the basic auth username value. You do not need to provide a password.

The private key always starts with a `private_` prefix. You can view your API keys in the ImageKit.io dashboard under the developer options.

To authenticate, pass the private key as the Basic Auth username with an empty password. The Base64-encoded value of `your_private_api_key:` (note the trailing colon) is sent in the `Authorization: Basic <encoded_value>` header.

**Key types:**

- **Standard keys**: A standard API key has read and write access to all the APIs. At any time, you can have a maximum of 5 standard keys.
- **Restricted keys**: A restricted API key allows only the minimum level of access that you specify across all the APIs. Use restricted keys for integrations that only need access to specific operations.

**Required credentials:**

- **Private API Key** (required): Used for server-side API authentication.
- **Public API Key** (required for client-side uploads): Used in frontend SDKs to identify the account.
- **URL Endpoint** (required for URL generation): Your ImageKit URL endpoint, e.g., `https://ik.imagekit.io/your_imagekit_id/`.

**Client-side uploads:** For secure client-side file uploads, the server generates authentication parameters (token, expiry timestamp, and HMAC signature) using the private key. These parameters are passed to the client SDK, which uses them along with the public key to upload files without exposing the private key.

## Features

### File Upload

Upload files to the ImageKit Media Library from the server or client side. Supports uploading from file streams, byte arrays, URLs, or Base64-encoded data. During upload, besides file name, you can set many other parameters like tags, auto AI tagging, AI background removal, custom metadata, etc.

- You can apply pre-transformation to modify images & videos before they are uploaded to ImageKit.
- You can apply post-transformation to eagerly transform images & videos once upload is complete.
- You can apply several post-transformations to an asset, with a maximum limit of five.
- You can include a webhookUrl parameter during file upload. The final status of extensions will be delivered to this endpoint as a POST request.

### Digital Asset Management

Build a Headless DAM solution by natively integrating the ImageKit Media Library with search, list, copy, move, and other operations exposed via APIs.

- Organize your assets in folders and subfolders. Create virtual collections to group assets based on your requirements.
- Search millions of assets quickly. ImageKit DAM provides a powerful search experience, from simple auto-suggestions to advanced search queries. You can also use AI-powered visual search to find assets based on their content.
- File operations include listing, getting details, updating, deleting, copying, moving, renaming, and managing file versions.
- Bulk operations are supported for adding and removing tags.

### File Metadata

Get a file's metadata by its file ID or URL. This includes embedded EXIF data, image dimensions, and other technical metadata.

### Custom Metadata Fields

Create, read, and update custom metadata fields in your ImageKit Media Library via APIs. These fields can then be updated for your files via the Update File or Upload File API.

- Custom metadata supports various data types and can be used for storing business-specific information about assets.

### Image and Video Transformations

50+ real-time optimizations, transformations, and streaming capabilities via a URL-based image and video processing API.

- Resize, crop, add overlays (text and images), apply effects and enhancements, format conversion, and quality optimization.
- Video-specific: trimming, thumbnail generation, adaptive bitrate streaming (HLS/DASH), audio transformations.
- AI transformations including background removal, upscaling, and more.
- Transformations are applied by appending parameters to the asset URL, not via separate API calls.

### AI-Powered Extensions

ImageKit DAM provides AI-powered auto-tagging that automatically assigns tags to your files based on their content. The auto-tagging feature uses machine-learning algorithms to analyze the file's content and assign relevant tags.

- ImageKit leverages label detection APIs by Google Cloud Vision and Amazon Rekognition to provide accurate and relevant tags.
- Configurable minimum confidence threshold for tags.
- AI-powered background removal via Remove.bg integration.
- Use AI tasks to automate controlled vocabulary tagging and custom metadata updates.
- AI-based image generation from text prompts.

### Cache Management

Initiate cache purge requests and check their status via APIs. This allows you to invalidate CDN-cached versions of assets when they are updated.

## Events

ImageKit uses webhooks to notify your application when an event occurs in your account. Webhooks are particularly useful for asynchronous events such as video encoding and extension processing during uploads.

Webhooks are configured in the ImageKit dashboard under Developer options. You enter a valid HTTP(S) endpoint, select the events you want to receive, and click "Create." ImageKit follows the Standard Webhooks specification for secure webhook verification and sends `webhook-id`, `webhook-timestamp`, and `webhook-signature` HMAC-SHA256 signature headers.

### Video Transformation Events

Tracks the lifecycle of asynchronous video encoding/transformation operations.

- **`video.transformation.accepted`**: Triggered when a new video transformation request is accepted for processing.
- **`video.transformation.ready`**: Triggered when a video encoding is finished, and the transformed resource is ready to be served.
- **`video.transformation.error`**: Triggered if an error occurs during encoding.

### Upload Pre-Transformation Events

Tracks the result of pre-transformations applied to files before they are stored.

- **`upload.pre-transform.success`**: Triggered when a pre-transform happens successfully.
- **`upload.pre-transform.error`**: Triggered if an error occurs during the pre-transformation.

### Upload Post-Transformation Events

Tracks the result of post-transformations applied to files after upload.

- **`upload.post-transform.success`**: Triggered when a post-transform happens successfully. Each post-transformation will have its separate webhook sent.
- **`upload.post-transform.error`**: Triggered if an error occurs during a post-transformation.
