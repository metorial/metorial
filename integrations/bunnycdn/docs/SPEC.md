Let me get more details on the bunny.net API features and the Stream webhook specifics.# Slates Specification for BunnyCDN

## Overview

BunnyCDN (bunny.net) is a content delivery network and cloud platform offering CDN distribution via pull zones, edge storage, video streaming (Bunny Stream), DNS hosting, DDoS/WAF security (Bunny Shield), and edge computing (Edge Scripting and Magic Containers). It provides RESTful APIs to manage all of these services programmatically.

## Authentication

BunnyCDN uses API key-based authentication via the `AccessKey` HTTP header. Each API endpoint uses a different type of Access Key for authentication. If you do not use the correct Access Key for your specific API, you will receive 401 Unauthorized errors.

There are three types of API keys:

1. **Account API Key**: You will need your global API account key to perform administrative functions (e.g., billing, statistics, purging, managing zones, etc.). This is in your account dashboard. To find it, visit: The new Dashboard > Profile picture > Edit account details > API Key. This key is used for the Core Platform API (`https://api.bunny.net`).

2. **Storage Zone Password**: Authenticate using the `AccessKey` header with your storage zone password. Use your storage zone password, not your account API key. The Edge Storage API uses the Storage Zone Password as the Access Key. To find it, visit: The new Dashboard > Storage > Storage Zone Name > FTP & API Access > Password. Each storage zone has its own password. The Storage API base URL depends on the storage zone's region (e.g., `https://storage.bunnycdn.com` for the default, or `https://{region}.storage.bunnycdn.com` for other regions).

3. **Stream Library API Key**: The Stream API uses an Access Key that is unique to each video library. This key is found in the video library's API settings in the dashboard. The Stream API base URL is `https://video.bunnycdn.com`.

All three key types are passed the same way — as the value of the `AccessKey` header on every request:

```
AccessKey: YOUR_KEY_HERE
```

## Features

### Pull Zone Management

Create and configure CDN pull zones for content delivery. Pull zones define origin servers, caching rules, custom hostnames, SSL settings, geo-blocking, referrer restrictions, IP blocks, and request limits. You can also enable features like token authentication and URL signing for secure content delivery.

### Cache Purging

Purge cached content from the CDN, either for specific URLs or for entire pull zones. This is essential for invalidating stale content after updates at the origin.

### Edge Storage

The Edge Storage API provides a simple RESTful interface for managing files in your storage zones. You can upload, download, list, and delete files. Storage zones can be replicated across multiple global regions for performance and redundancy.

### Video Streaming (Bunny Stream)

BunnyCDN provides video hosting and streaming, TUS (Resumable Upload Protocol) for large file uploads, video transcoding and encoding, and video library management. You can create and manage video libraries, organize videos into collections, upload videos (including resumable uploads via TUS), configure encoding resolutions, enable DRM, set up advertising (VAST), generate automatic captions and titles, and manage playback security settings.

### DNS Management

Create and manage DNS zones and records. Supports standard DNS record types and allows programmatic configuration of DNS settings.

### Security (Bunny Shield)

Configure web application firewall (WAF) rules, DDoS protection, bot detection, rate limiting, access lists, and upload scanning. Includes event logs and metrics for monitoring security activity.

### Edge Scripting

Deploy and manage serverless edge scripts that run on bunny.net's global network. Manage script code, variables, secrets, and releases.

### Magic Containers

Deploy and manage containerized applications at the edge. Configure applications, autoscaling settings, container registries, endpoints, volumes, and regional settings.

### Statistics and Billing

Access bandwidth, request, and cache hit statistics across your account or per pull zone. View billing summaries, usage details, and manage pricing packages.

### Token Authentication / Signed URLs

Generate signed URLs that restrict access to content by time, IP address, country, or directory path. This is configured per pull zone using a security key.

## Events

BunnyCDN supports webhooks for its **Bunny Stream** (video) product only.

### Video Processing Status Changes

Bunny Stream allows you to configure a webhook URL. The system will automatically send notifications back to this URL once a video status changes. This allows you to track the updates and progress of the video processing cycles on your side.

The webhook is configured per video library and sends a POST request with the video library ID, video GUID, and a status code. The following status changes are reported:

- **Queued**: Video has been queued for encoding.
- **Processing**: Video has begun processing preview and format details.
- **Encoding**: Video is encoding.
- **Finished**: Video encoding is complete and fully available.
- **Resolution finished**: One resolution has finished processing; the video is now playable.
- **Failed**: Video encoding failed.
- **PresignedUploadStarted / Finished / Failed**: Pre-signed upload lifecycle events.
- **CaptionsGenerated**: Automatic captions were generated.
- **TitleOrDescriptionGenerated**: Automatic title or description generation completed.

There are no webhook or event subscription mechanisms for other BunnyCDN services (CDN, Storage, DNS, Shield, etc.).
