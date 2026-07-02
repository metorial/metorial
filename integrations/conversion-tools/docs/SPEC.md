Now let me get the full list of conversion types and check for webhook/callback support:# Slates Specification for Conversion Tools

## Overview

Conversion Tools (conversiontools.io) is an online file conversion service that provides a REST API for converting files between 100+ formats including documents (PDF, Word, Excel, PowerPoint), images (JPG, PNG, WebP, AVIF, HEIC, JXL, SVG), data formats (JSON, XML, CSV, YAML, Parquet, JSONL, BSON), eBooks (ePUB, MOBI, AZW), audio/video (MP4, MP3, WAV, FLAC), and subtitles (SRT, VTT). It also offers AI-powered conversions, OCR, and website-to-image/PDF capture.

## Authentication

Conversion Tools uses **Bearer Token** authentication via an API Token.

- When an account is created, an API Token is generated for accessing the REST API. The API Token can be found at your Profile page (https://conversiontools.io/profile).
- The API Token is passed in the `Authorization` HTTP header using the Bearer scheme: `Authorization: Bearer <API Token>`

There is no OAuth2 flow or additional scopes. Simply sign up for an account, retrieve your API token from your profile page, and include it in every request.

**Base URL:** `https://api.conversiontools.io/v1/`

## Features

### File Conversion

Convert files between a wide range of formats. The platform supports document, image, and eBook conversions, plus website data extraction capabilities. The conversion workflow is asynchronous: upload a file (or provide a URL), create a conversion task, poll for task completion, then download the result.

- **Supported format categories:** Documents (PDF, Word, PowerPoint, Excel, ODS, OXPS, Markdown, HTML), images (JPG, PNG, WebP, AVIF, HEIC, JXL, TIFF, BMP, SVG, GIF, PGM, PPM, PAM, YUV), data/text (JSON, XML, CSV, YAML, Parquet, JSONL, BSON, Excel XML), eBooks (ePUB, MOBI, AZW, AZW3, FB2, FBZ), audio (MP3, WAV, FLAC), video (MP4, MOV, MKV, AVI), subtitles (SRT, VTT).
- **Conversion options vary by type:** Common options include delimiter choice for CSV output (comma, semicolon, tab, vertical bar), image quality/resolution settings, page orientation, margins, Excel format (XLS/XLSX), color mode, and encoding.
- Input can be provided either by uploading a file or by specifying a URL for certain conversion types (e.g., XML, HTML, website captures).

### AI-Powered Conversions

Use AI to extract structured data from documents and images. Available AI conversion types include:

- PDF to structured JSON, Markdown, CSV, or Excel (AI-powered extraction).
- PNG/JPG to structured JSON.
- AI-powered SRT subtitle translation supporting 30+ languages.
- AI to SVG (Adobe Illustrator file conversion).
- AI conversions consume separate AI Conversion Credits from regular API calls.

### OCR (Optical Character Recognition)

Extract text from images and scanned PDFs. Supported OCR conversions include PNG/JPG/PDF to text, and PNG/JPG/PDF to searchable PDF.

- **Language support:** Over 100 OCR languages can be specified (multiple languages can be combined with comma separation).
- Handles scanned documents, images of text, and image-based PDFs.

### Website Capture

Convert web pages to PDF, JPG, or PNG. Provide a URL and optionally configure:

- Page orientation, size, and color mode (for PDF output).
- Viewport dimensions and device emulation (for image output) with a wide range of pre-configured device profiles (iPhones, iPads, Pixels, Galaxy devices, etc.).
- Whether to include background, images, and JavaScript rendering.
- Custom margin settings for PDF output.

### Data Format Transformation

Convert between structured data formats such as JSON, XML, CSV, Excel, YAML, Parquet, JSONL, and BSON.

- Options include delimiter selection, quoting behavior, header row handling, XML encoding, indentation/spacing, and whether to include index attributes or empty nodes.
- Supports BSON (MongoDB dump) to CSV/Excel conversion with raw data export options.
- XML/XSD validation is available.
- JSON formatting and validation utilities are included.

### eBook Conversion

Convert between eBook formats (ePUB, MOBI, AZW, AZW3, FB2, FBZ) and to/from PDF.

### Audio/Video Conversion

Convert between audio formats (MP3, WAV, FLAC) and video formats (MOV, MKV, AVI to MP4). Extract audio from video (MP4 to MP3).

- **Audio options:** Bitrate selection (96–320 kbps for MP3), sampling rate (8000–48000 Hz for WAV), bit depth (8/16/24/32), and channel count.

### Subtitle Conversion

Convert between subtitle formats (SRT, VTT) and export subtitles to CSV, Excel, or plain text. Also supports creating SRT files from CSV or Excel.

- Options include delimiter, multiline join behavior, and markup clearing.

### Image Utilities

- Convert between numerous image formats including modern formats (WebP, AVIF, HEIC, JXL).
- Remove EXIF metadata from photos.
- Configurable JPEG quality, WebP quality, image resolution (PPI), color mode, and background transparency.

### Markdown Conversion

Convert Markdown files to PDF, HTML, ePUB, Word (DOCX), LaTeX, or plain text. Also convert HTML or Word documents to Markdown.

### Sandbox Mode

All plans include unlimited sandbox testing for development and testing purposes without consuming API call quotas.

## Events

Conversion Tools supports **webhook callbacks** for task completion notifications.

### Task Completion Callback

When creating a conversion task, you can provide a `callbackUrl` parameter. When the conversion task finishes (either successfully or with an error), the service will send a notification to the specified URL.

- **Parameter:** `callbackUrl` — a URL that will be called when the task completes.
- This is an alternative to polling the task status endpoint and is useful for asynchronous workflows where you want to be notified when a conversion is done rather than polling for status.
