# Supadata API Specification

## Overview

Supadata is a web content extraction API that converts videos and web pages into structured, machine-readable text and data. It supports video transcripts from YouTube, TikTok, Instagram, Facebook, and X (Twitter), media metadata extraction, AI-powered structured data extraction from videos, and web scraping/crawling for any URL. It also provides YouTube-specific metadata for videos, channels, and playlists.

## Authentication

All API requests require authentication using an API key. The API key is passed via a custom request header:

```
x-api-key: YOUR_API_KEY
```

The same key works with direct API calls, SDKs, and no-code integrations.

To obtain an API key:

1. Sign up for an account at [dash.supadata.ai](https://dash.supadata.ai).
2. The API key is generated automatically during onboarding and is available in the dashboard.

The base URL for all API endpoints is `https://api.supadata.ai/v1`.

There is no OAuth2 flow or additional scopes. Authentication is solely via the API key header.

## Features

### Video Transcription

Extract text transcripts from videos hosted on YouTube, TikTok, Instagram, X (Twitter), Facebook, or from public file URLs (MP4, WEBM, MP3, WAV, etc.).

- **Language preference**: Specify a preferred language via ISO 639-1 code. If unavailable, the first available language is returned along with a list of alternatives.
- **Output format**: Return either timestamped chunks (with offset and duration per segment) or plain text.
- **Transcription mode**: `native` (only existing captions), `generate` (AI-generated transcript), or `auto` (try native first, fall back to AI).
- Large files or long videos may return a job ID for asynchronous processing, which can be polled for results.
- Only publicly accessible videos can be transcribed. Private, login-required, age-restricted, or paywalled content is not supported.
- Maximum file size for direct file URLs is 750 MB and maximum duration is 12 hours.

### Media Metadata

Fetch metadata from videos and posts hosted on YouTube, TikTok, Instagram, X (Twitter), or Facebook. Returns a unified schema including:

- Platform, content type (video, image, carousel, post), title, description
- Author information (username, display name, avatar, verified status)
- Engagement stats (views, likes, comments, shares)
- Media details (duration, thumbnail, carousel items)
- Tags and creation date
- Platform-specific additional data (e.g., channel info for YouTube, music/sound info for TikTok)

### Structured Data Extraction (AI)

Use AI to extract structured data from video content across all supported platforms.

- Provide a natural language **prompt** describing what to extract, a **JSON Schema** defining the output structure, or both.
- When only a prompt is provided, the AI auto-generates a schema which is returned for reuse.
- Always processes asynchronously via job IDs.
- Analyzes what is seen and heard in the video (visuals, audio, context) — does not retrieve transcripts or platform metrics.
- File URL support is limited to 200 MB and 55-minute maximum duration.

### Web Scraping

Extract content from any web page and receive it in clean markdown format with page name, description, and character count.

- Option to exclude links from the scraped content.
- Returns structured output including URL, content, page name, and description.

### Website Mapping

Scan a whole website and get all URLs on it. Can be used to create a sitemap or run a crawler to fetch content of all pages of a destination.

### Website Crawling

Crawl a whole website and get content of all pages on it.

- Crawling is asynchronous — you create a crawl job and poll for results.
- Configurable page limit.
- Results expose a next-page URL; its `skip` parameter retrieves subsequent pages.
- The crawler follows only child links. For example, crawling `https://example.com/blog` will follow links like `https://example.com/blog/article-1` but not `https://example.com/about`.

### Account Information

Retrieve the API key's organization ID, subscription plan, maximum credits, and used credits through `GET /me`. The account tool also computes credits remaining in the billing period.

### YouTube-Specific Features

Beyond the universal transcript and metadata endpoints, Supadata offers YouTube-specific capabilities:

- **YouTube Search**: Search YouTube for videos, channels, playlists, and movies with upload-date, duration, and feature filters. Use a result limit for automatic pagination or continuation tokens for individual pages.
- **Channel Metadata**: Fetch metadata from a YouTube channel including name, description, subscriber count, and more.
- **Channel Videos**: Fetch a list of video IDs from a YouTube channel. Filterable by type (video, short, live, or all) with configurable limit. Regular video, Shorts, and live IDs are returned separately.
- **Playlist Metadata**: Fetch metadata from a YouTube playlist including title, description, video count, and more.
- **Playlist Videos**: Fetch regular video, Shorts, and live IDs from a YouTube playlist.
- **Transcript Translation**: Fetch text transcript from a YouTube video in various formats and languages, translating the transcript into a target language.

## Events

The provider does not support events. Supadata is a request-response API for data extraction and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms for change detection.

## API References

- [API authentication and base URL](https://docs.supadata.ai/)
- [Account information](https://docs.supadata.ai/api-reference/endpoint/account/me)
- [Transcript](https://docs.supadata.ai/get-transcript)
- [Media metadata](https://docs.supadata.ai/get-metadata)
- [Structured extraction](https://docs.supadata.ai/get-extract)
- [YouTube search](https://docs.supadata.ai/youtube/search)
- [YouTube video metadata](https://docs.supadata.ai/api-reference/endpoint/youtube/video-get)
- [YouTube channel](https://docs.supadata.ai/youtube/channel)
- [YouTube playlist](https://docs.supadata.ai/youtube/playlist)
- [Channel videos](https://docs.supadata.ai/youtube/channel-videos)
- [Playlist videos](https://docs.supadata.ai/youtube/playlist-videos)
- [Transcript translation](https://docs.supadata.ai/api-reference/endpoint/youtube/translation)
- [Web scraping](https://docs.supadata.ai/web/scrape)
- [Website mapping](https://docs.supadata.ai/web/map)
- [Website crawling](https://docs.supadata.ai/web/crawl)
- [Error responses](https://docs.supadata.ai/errors/list)
