Let me look for the specific API endpoints in the documentation.Now let me get more details on the send campaign endpoint settings and the other API endpoints:Now I have enough information to write the specification. Let me also quickly check the get campaign and get campaign list endpoints for completeness:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Campaign Cleaner

## Overview

Campaign Cleaner is an email campaign optimization tool that analyzes and fixes HTML email campaigns to improve deliverability and avoid spam filters. It sanitizes HTML, inlines CSS, detects spam trigger keywords, checks for blacklisted links, identifies broken links, and optimizes images for email client compatibility. The service operates on a credit-based model where each campaign processing consumes credits.

## Authentication

Campaign Cleaner uses API key authentication. The API key is passed via a custom HTTP header on every request.

- **Method:** API Key
- **Header Name:** `X-CC-API-Key`
- **Header Value:** Your API key
- **Obtaining the key:** Log in to the Campaign Cleaner dashboard at `https://members.campaigncleaner.com` and navigate to **API Management → API Keys** to find or generate your API key.
- **Base URL:** `https://api.campaigncleaner.com/v1/`

Example header:

```
X-CC-API-Key: your_api_key_here
```

## Features

### Campaign Processing and Cleaning

Submit an HTML email campaign for automated analysis and optimization. Campaign Cleaner sanitizes the HTML and applies a wide range of fixes to improve email deliverability and cross-client compatibility.

- **Required inputs:** The full HTML of the campaign and a campaign name.
- **CSS Inlining:** Inline CSS styles directly into HTML elements for email client compatibility, with options to preserve media queries and control `!important` flags.
- **Inherited CSS Removal:** Strip inherited/computed CSS properties after inlining to reduce HTML size.
- **Font adjustments:** Automatically adjust spam-triggering font colors (e.g., pure red) to visually identical but filter-safe alternatives. Enforce minimum and maximum font sizes.
- **Character replacement:** Replace non-ASCII characters and diacritics with safe equivalents to avoid spam triggers.
- **HTML cleanup:** Remove comments, classes/IDs, control characters, non-printable characters, and successive punctuation. Optionally convert H tags to P tags and convert tables to divs (experimental).
- **Image handling:** Optionally resize, convert, and host images on Campaign Cleaner's CDN. Set max-width on images and remove height attributes to prevent distortion.
- **Surrounding div:** Optionally wrap the campaign HTML in a styled `<div>` with configurable max-width, text alignment, font size, and centering.
- **Relative URL conversion:** Convert relative URLs to absolute using a specified base URL.
- **Webhook support:** Supply a `webhook_url` to receive results automatically when processing completes.
- **Custom metadata:** Pass up to 500 characters of custom info that is returned with campaign results.
- Processing typically completes in seconds but may take longer for campaigns with many images/links.

### Campaign Analysis and Reporting

Retrieve detailed analysis results for a processed campaign, including the cleaned HTML and comprehensive diagnostics.

- **Spam analysis:** Spam keyword list with occurrence counts, spam keyword ratio vs. acceptable thresholds, and capitalized word ratio analysis.
- **Link analysis:** Full list of all links scanned, broken links identified with status codes, blacklisted links detected against known blacklists, poor-delivery CDN detection, and link redirect tracking.
- **Image analysis:** Inventory of all images with dimensions and file sizes, detection of oversized images, background image identification, and missing alt attribute counts.
- **Content metrics:** Text-to-image ratio, text-to-link ratio, total word count, header tag count, and missing title attributes on links.
- **Campaign summary:** A list of changes applied and issues found, indicating what was corrected in the HTML and what requires manual attention.
- **HTML output options:** Optionally minify the cleaned HTML output.

### Campaign PDF Analysis Report

Download the campaign analysis as a PDF report for sharing or archival purposes.

- Requires only the campaign ID.
- Returns the report as a PDF file stream.

### Campaign Management

List, check status of, and delete saved campaigns.

- **Campaign List:** Retrieve the status of all campaigns in your account.
- **Campaign Status:** Check the processing status of a specific campaign by ID.
- **Delete Campaign:** Remove a saved campaign from your account by ID.

### Credit Management

Check available credits in your account. Credits are consumed each time a campaign is submitted for processing.

## Events

Campaign Cleaner supports webhooks for campaign processing completion. When submitting a campaign for processing, you can provide a `webhook_url` parameter. Once the campaign is fully processed, Campaign Cleaner sends the complete campaign results (equivalent to the Get Campaign response) to your specified webhook endpoint. The webhook endpoint can be tested and troubleshot via the API Management section of the Campaign Cleaner dashboard.
