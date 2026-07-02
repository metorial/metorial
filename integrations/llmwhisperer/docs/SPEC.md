# Slates Specification for LLMWhisperer

## Overview

LLMWhisperer is a document preprocessing API by Unstract (Zipstack) that converts complex documents — PDFs, scanned images, Office documents, and spreadsheets — into LLM-optimized text. It presents data from complex documents (different designs and formats) to LLMs in a way that they can best understand. It is available as an API that can be integrated into existing systems to preprocess documents before they are fed into LLMs.

## Authentication

All APIs require an API key to be passed in the header. You can get your API key by signing up for LLMWhisperer. The API key is passed in the header as `unstract-key`.

**Method:** API Key (header-based)

- **Header name:** `unstract-key`
- **How to obtain:** Sign up for a LLMWhisperer account at the Unstract platform.

**Base URLs (regional):**

- US Central: `https://llmwhisperer-api.us-central.unstract.com/api/v2`
- EU West: `https://llmwhisperer-api.eu-west.unstract.com/api/v2`

Example:

```
curl -X GET 'https://llmwhisperer-api.us-central.unstract.com/api/v2/get-usage-info' \
  -H 'unstract-key: <YOUR_API_KEY>'
```

## Features

### Document Text Extraction

Convert complex PDF documents, scanned documents, scanned images, Office documents, and spreadsheets to text format which can be used with LLMs. Documents can be submitted via file upload or URL.

- **Extraction modes:**
  - `native_text` — For documents with digitally embedded text (not scanned), such as software-generated PDFs or Word files. Very fast and cost-effective.
  - `low_cost` — For decent-quality scanned images/PDFs without handwriting. Good accuracy with lower cost.
  - `high_quality` — For challenging inputs like handwritten or low-quality scans. Maximum accuracy using advanced OCR and AI enhancements.
  - `form` — For documents that include forms, checkboxes, radio buttons, or structured form-like layouts.
  - `table` — For documents with dense table structures like financial reports, statements, spreadsheets. Extracts tabular data with layout and cell grouping preserved.

- **Output modes:**
  - `layout_preserving` — Extracts text while maintaining the structural layout of the document. Removes white spaces and unwanted characters to optimize for LLM consumption.
  - `text` — Extracts text without applying any layout processing. Useful as a fallback when layout-preserving mode doesn't work well.

- **Image preprocessing options:** Configurable median filter size and Gaussian blur radius to improve OCR quality on scanned documents.
- **Page selection:** Ability to specify which pages to extract.
- LLMWhisperer can switch automatically to OCR mode if text mode extraction fails to generate sufficient output.

### Extraction Status and Retrieval

The typical workflow is to submit a document for extraction, then check the status of the conversion process, repeating until the status is "processed," and then retrieve the converted text. This supports asynchronous processing of documents.

### Text Highlighting and Line Metadata

Location information about every line of text extracted from the document can be retrieved, which can be used to highlight search terms or extraction results in a frontend application. Line numbers can be added to the extracted text, and line metadata can be queried later using the highlights API. You can search for specific text and get bounding box coordinates for highlighting.

### Usage Tracking

The APIs are metered based on the number of pages processed per mode (native_text, low_cost, high_quality and form). You can check usage metrics of your account, including filtering by tag.

## Events

LLMWhisperer supports webhooks for document extraction completion notifications.

### Document Extraction Completed

A webhook (callback) can be registered, which only needs to be done once. After that, the webhook can be referenced by name in extraction requests. The webhook will be called after the conversion is done.

- **Registration:** Requires a callback URL, an optional bearer auth token, and a webhook name.
- When registering, LLMWhisperer sends a test payload to verify the URL is functioning. If the URL is not functioning, the webhook will not be registered. The URL should return a 200 status code.
- **Payload:** Includes the extraction result text, line metadata, confidence metadata, and any custom metadata passed during the extraction request.
