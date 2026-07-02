# Slates Specification for OCR.space

## Overview

OCR.space is a cloud-based Optical Character Recognition (OCR) service by a9t9 software GmbH that extracts text from images and PDF documents. It supports multiple OCR engines, numerous languages, and can generate searchable PDFs from scanned documents.

## Authentication

OCR.space uses **API key** authentication. The API key is sent as an HTTP header with each request.

- **Header format:** `apikey: YOUR_API_KEY`
- **Free API key:** Obtained by registering at [https://ocr.space/ocrapi/freekey](https://ocr.space/ocrapi/freekey). The key is active immediately upon registration.
- **PRO API key:** Received via email after subscribing to a PRO or PRO PDF plan. PRO keys include access to dedicated endpoint URLs.

Example using cURL:

```
curl -H "apikey:YOUR_API_KEY" --form "file=@image.png" https://api.ocr.space/parse/image
```

There are no OAuth flows, scopes, or additional credentials required. The same API key format is used across all tiers (Free, PRO, PRO PDF).

## Features

### Text Extraction from Images and PDFs

Extracts text from images (JPG, PNG, GIF, BMP, TIFF) and PDF documents. Input can be provided as a file upload, a remote URL, or a Base64-encoded string. Multi-page PDFs and multi-page TIFFs are supported. The free tier is limited to 1 MB file size and 3 PDF pages; PRO PDF supports 100 MB+ and 999+ pages.

### Multiple OCR Engines

Three OCR engines are available, selectable via the `OCREngine` parameter:

- **Engine 1:** Fastest engine, supports the widest range of languages including Asian languages, and multi-page TIFF.
- **Engine 2:** Better for text on complex backgrounds (road signs, license plates, memes), special characters, rotated text, and single character/number recognition. Supports automatic language detection.
- **Engine 3:** Best text recognition quality with markdown-formatted output, supports 200+ languages, handwriting recognition, automatic table/layout recognition, and checkbox detection. Slower for larger files and still in development with no uptime guarantee.

### Language Support

Supports over 25 explicitly listed languages (including Arabic, Chinese, Japanese, Korean, and major European languages) on Engines 1 and 2. Engine 3 supports 200+ languages with automatic language detection using the `language=auto` parameter.

### Searchable PDF Generation

Converts scanned images and PDFs into searchable (sandwich) PDFs with a text layer. Configurable options include making the text layer visible or hidden. The generated PDF is available as a download link valid for one hour. Free tier PDFs include a watermark.

### Text Overlay / Word Coordinates

When `isOverlayRequired` is set to true, the API returns bounding box coordinates (position, height, width) for each recognized word, organized by lines. Useful for overlaying recognized text on top of the original image.

### Image Preprocessing Options

- **Auto-rotation:** The `detectOrientation` parameter auto-rotates images and reports the rotation angle.
- **Upscaling:** The `scale` parameter enables internal upscaling to improve OCR results on low-resolution scans.
- **Table mode:** The `isTable` parameter optimizes recognition for table-structured documents like receipts and invoices, ensuring line-by-line output.

### Usage Tracking (PRO only)

PRO and PRO PDF users can query their conversion counts via the `https://myapi.ocr.space/conversions` endpoint, broken down by OCR engine and time period.

## Events

The provider does not support events.
