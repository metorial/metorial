# Happy Scribe Specification

## Overview

Happy Scribe is a cloud-based transcription and subtitling platform that converts audio and video files into text using AI-powered automatic transcription or human professional transcription services. It supports 120+ languages and offers translation, subtitle generation, and export to various formats.

## Authentication

Happy Scribe uses API keys to allow access to the API. You can get your API key by logging in and going to settings.

You can get your HappyScribe API key by logging in and going to your "Account" page. HappyScribe expects the API key to be included in all API requests to the server in an `Authorization` header.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer your_api_key_here
```

The base URL for all API requests is `https://www.happyscribe.com/api/v1/`.

No OAuth2 or other authentication methods are supported — only API key-based authentication.

## Features

### File Uploads

Upload audio and video files to Happy Scribe's storage for transcription. When creating a transcription, a media file URL accessible to their servers must be provided. This can be a publicly accessible URL hosted by you or a third-party. They also support public links from services like YouTube and Vimeo. Alternatively, you can upload files directly to their storage system (AWS S3 bucket) and create the transcription using the returned URL.

### Transcription and Subtitling Orders

Create orders for transcription or subtitling of audio/video files. Orders support both automatic (AI) and professional (human) service types. Key options include:

- **Language**: Specify the source language from 120+ supported languages.
- **Subtitle mode**: Treat the output as subtitles rather than a plain transcription.
- **Service type**: Choose `auto` for machine transcription or `pro` for human professional transcription.
- **Boost**: Expedite professional orders for faster turnaround.
- **Glossaries**: Attach glossaries containing domain-specific terminology to improve accuracy.
- **Style guides**: Apply style guides that control formatting preferences such as verbatim mode, grammar correction, SDH (Subtitles for the Deaf and Hard of Hearing), speaker identification, and notation tags.
- **Tags and folders**: Organize transcriptions with tags and folder paths within an organization.
- Orders can be confirmed immediately or created in a draft ("incomplete") state and confirmed later.

### Translation

Translate existing transcriptions into one or more target languages. Supports 70+ target languages. Translation can be automatic or done by human professionals. When translating a transcription that is itself already a translation, the system automatically uses the original source transcription.

### Exporting Transcriptions

Export completed transcriptions into a variety of formats:

- Text (.txt), Word (.docx), PDF (.pdf)
- Subtitle formats: SubRip (.srt), WebVTT (.vtt), EBU-STL (.stl)
- Professional editing formats: Avid Markers (.txt), Premiere Pro (.xml), Final Cut Pro (.fcp)
- Other formats: Interactive Transcript (.html), MAXQDA (.txt), JSON (.json)

Export options include toggling timestamps, speaker labels, comments, highlights, and inline timecode frequency.

### Managing Transcriptions

List, retrieve, and delete transcriptions. Transcriptions can be filtered by organization, folder, and tags. Each transcription exposes metadata such as state, language, duration, cost, and sharing status.

### Glossaries

List available glossaries within an organization. Glossaries define source-to-target terminology mappings and can be attached to orders for consistent transcription and translation of domain-specific terms.

### Style Guides

List available style guides within an organization. Style guides define transcription and subtitling preferences such as verbatim mode, grammar correction, SDH, speaker identification format, and notation tags.

## Events

Happy Scribe supports webhooks for order status changes. When creating a transcription, subtitling, or translation order, you can provide a `webhook_url` parameter. Happy Scribe will send a webhook notification to that URL when the order changes state (e.g., from submitted to fulfilled, or to failed).

### Order State Changes

- **Description**: Notifies when an order transitions between states such as submitted, fulfilled, failed, canceled, or locked.
- **Configuration**: Set the `webhook_url` parameter when creating an order. The webhook is scoped to that specific order.
- **Limitation**: Webhooks are configured per-order at creation time; there is no global webhook subscription mechanism.

## Organization discovery and updates

Use `list_organizations` to discover the authenticated account's organization IDs, names and membership roles. The optional saved organization setting remains supported. `update_transcription` renames, moves or changes public link sharing with the documented transcription update endpoint. `get_meeting_summary` reads generated notetaker summary text; no summary yet is a provider 404.

## Export and media workflow

`create_export` returns the provider's asynchronous export state without waiting or copying a temporary URL. `get_export` checks that state. The legacy `export_transcription` contract is preserved and deprecated. Exports additionally support the documented editing formats, CSV, XLSX, MP3 and MP4. Media exports require a single transcription, and MP4 requires video.

`download_export` and `download_transcription_media` retrieve file bytes immediately and produce a downloadable file. Only the exact HTTPS `media.happyscribe.com` host is currently evidenced by the official API examples. Supported downloads are MP3, MP4, PDF, UTF-8 TXT, SRT, Facebook SRT, WebVTT and transcript JSON. Other hosts, formats, redirects, invalid file bodies, expired signed links and files above 100 MiB fail explicitly. Downloads for other hosts and unsupported body formats must be completed in Happy Scribe. The integration never recreates an expired export automatically. Reading export metadata does not renew a signed URL.

Source: [Happy Scribe Product API](https://dev.happyscribe.com/sections/product/).
