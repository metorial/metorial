# Slates Specification for Shotstack

## Overview

Shotstack is a video, image and audio editing service that allows for the automated generation of videos, images and audio using JSON and a RESTful API. There are three API's, one for editing and generating assets (Edit API), one for managing hosted assets (Serve API) and one for ingesting and transforming source assets (Ingest API). A fourth API, the Create API, generates images, videos, voice overs and text using built-in and third party generative AI providers.

## Authentication

Shotstack uses API key authentication. The API key is passed via the `x-api-key` header with every request.

Sign up to the Shotstack service to generate API keys. Keys for both a staging sandbox and a live production environment are available in the dashboard.

Each API has its own base URL and collection of endpoints, but each API uses the same set of API keys.

There are two environments:

- **Production (`v1`)**: For production usage without watermarks.
- **Sandbox (`stage`)**: For development and testing. Only AI assets get charged in sandbox. Videos are watermarked.

Each environment has its own API key. The key is a random 40-character string obtained from the Shotstack dashboard under the API Keys section.

Example header: `x-api-key: YOUR_API_KEY`

## Features

### Video, Image, and Audio Editing

Shotstack uses a REST-based API that uses JSON data describing the arrangement of a video edit. JSON is used to arrange, trim and animate assets including images, video, titles and audio. It also includes built-in motion effects, transitions and filters. Edits are defined using a timeline-based model with tracks and clips, supporting output in formats like MP4 and GIF at various resolutions.

- Asset types include video, image, audio, HTML, and title overlays.
- Clips support transitions (fade, slide, etc.), effects (zoom, slide), filters (greyscale, boost), opacity, transformations (rotate, skew, flip), cropping, and chroma key.
- Soundtracks can be added with volume control and effects like fade in/out.
- Custom fonts can be loaded for use in text elements.
- The cloud-based API provides the infrastructure to allow thousands of videos to be rendered concurrently.

### Templates and Merge Fields

Templates allow saving reusable edit configurations. Templates can be rendered at a later date and can include placeholders. Placeholders can be replaced when rendered using merge fields. This enables mass personalization of videos by substituting dynamic values at render time.

### Asset Ingestion

The Ingest API is designed to be used with video, image, audio and font files. It can be used to upload, store and convert videos and images to a variety of formats, sizes, frame-rates, speeds and more.

- Supports fetching files from URLs or direct uploads.
- Source assets are stored by Shotstack until you delete them. Stored assets can be used directly in your edits.
- Transformations (renditions) can be applied during ingestion, such as resizing or format conversion.

### Asset Hosting and Distribution

Shotstack provides a built-in asset hosting service. Assets are stored on a high availability storage system and served globally via a CDN. Hosting is enabled by default and all assets rendered via the editing API or ingested via the ingest API are immediately sent to the hosting service.

- The Serve API allows looking up asset details, status, and URLs.
- Assets can be distributed to third-party destinations:
  - **Shotstack CDN** (default)
  - **AWS S3** — configurable bucket, region, prefix, and filename
  - **Mux** — with playback policy options (public/signed)
  - **Google Cloud Storage**, **Google Drive**, and **Vimeo** are also supported as destinations.
- Default Shotstack hosting can be excluded if only using external destinations.

### Generative AI Asset Creation (Create API)

The Create API allows programmatically generating assets using Generative AI. Use one or more built-in services or third party providers to create audio, image and video assets.

Built-in Shotstack provider services:

- Image to Video (converts images to videos), Text to Image, Text to Speech (with multiple voices and languages), and Text Generation (powered by GPT-4).

Third-party providers (require separate API keys configured in the Shotstack dashboard):

- **ElevenLabs**: realistic text-to-speech.
- **D-ID**: generates talking avatars from text.
- **Stability AI**: image generation using various Stable Diffusion engines and style presets.

AI-generated assets can be embedded directly into video edits or used as standalone assets.

### Media Inspection

The API provides a probe feature to inspect media files at a given URL, returning metadata about the file such as format, duration, and codec information.

## Events

Shotstack supports webhook callbacks for asynchronous process notifications. Webhooks are configured per request by including a `callback` URL in the JSON payload.

### Render Completion

When a render completes or fails, Shotstack will POST data to your web server. The payload includes the render ID, status (`done` or `failed`), output URL, and completion timestamp. Simply provide the URL of the endpoint in your application that will receive the POSTed data using the `callback` parameter of an edit.

### Asset Hosting (Serve) Completion

When a video or image is generated using the editing API, the file is copied to the hosting and storage location asynchronously. This process normally takes a few seconds and a webhook callback is sent when the asset arrives at the destination. You may receive up to 3 callback POSTs, one for each asset, if you create a video with a thumbnail and poster image.

### Ingestion Completion

You can request a webhook callback for ingestion events. The webhook callback is sent to your server with details of the ingested file transfer, direct upload or rendition status and whether it succeeds or fails.
