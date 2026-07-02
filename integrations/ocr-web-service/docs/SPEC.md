Let me try to access the OCR Web Service website and API documentation directly.Now I have comprehensive information about OCR Web Service. Let me compile the specification.

# Slates Specification for OCR Web Service

## Overview

OCR Web Service (ocrwebservice.com) is a cloud-based optical character recognition (OCR) service that provides SOAP and REST APIs to extract text from scanned documents and images. It allows users to convert scanned PDF and images into editable Word, Text, and Excel output formats. The service supports 46 recognition languages and multiple input/output document formats.

## Authentication

OCR Web Service uses **HTTP Basic Authentication**. USERNAME and LICENSE_KEY are strings, and both are provided by ocrwebservice.com.

Each API request must include an `Authorization` header with Basic authentication, where the credentials are the account username and license key (API password) encoded in Base64.

- **Username**: Your registered account username
- **Password**: Your license API key/password (provided upon account creation)

Requests are made to `https://www.ocrwebservice.com/restservices/` with `auth` using `username` and `license_api_password`.

Example:

```
Authorization: Basic base64(username:license_key)
```

Accounts can be created with a free trial that does not require a credit card.

## Features

### Document OCR and Text Extraction

Recognizes text from scanned documents and images and returns extracted text. Supports specifying one or multiple recognition languages per request (out of 46 supported languages including English, Chinese Simplified/Traditional, Japanese, Korean, Russian, and many European languages). The `gettext` parameter enables returning the recognized text directly in the response as a two-dimensional array organized by zones and pages.

- **Page range selection**: Process specific pages or page ranges from multi-page documents (e.g., `1,3,5-12` or `allpages`).
- **Black and white conversion**: Optionally convert color images/photos to black and white for improved recognition accuracy.
- **Word coordinates**: Optionally return the coordinates of each recognized word.
- **Newline formatting**: Optionally include newline characters in extracted text output.

### Zonal OCR

Allows recognition of text from specifically defined rectangular regions within an image rather than the full page. Zones are defined as pixel coordinates (top, left, height, width) relative to the top-left corner. Multiple zones can be specified per request, and the extracted text is returned separately for each zone and page.

### Document Format Conversion

Converts OCR results into editable document formats. Up to two output formats can be specified per request. The converted file is returned as a downloadable URL. Supported output formats:

- Adobe PDF (text-only or image+text)
- Microsoft Word (2003 .doc and 2007 .docx)
- Microsoft Excel (2003 .xls and 2007 .xlsx)
- RTF
- Plain text

### Supported Input Formats

Accepts PDF (including multi-page), TIF/TIFF (including multi-page), JPEG, BMP, PCX, PNG, GIF, and ZIP archives containing these file types. Maximum input file size is 100 MB. Recommended input resolution is 200–400 DPI.

### Account Information

Retrieve current account details including available page balance, maximum pages for the subscription plan, subscription type, and license expiration date.

## Events

The provider does not support events.
