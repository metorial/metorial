# Slates Specification for Heyzine

## Overview

Heyzine is an online flipbook maker that converts PDFs, DOCX, and PPTX files into interactive digital flipbooks with page-turning effects. It provides an API for programmatic flipbook creation, management, access control, and lead collection via webhooks.

## Authentication

Heyzine supports two authentication methods:

1. **Client ID**: Used for flipbook conversion endpoints (Link Conversion and REST API Conversion). The Client ID is passed as a query parameter (`k`) or in the request body (`client_id`). Found in the account's developer settings page.

2. **API Key**: Used for flipbook management, bookshelf management, social metadata, and password protection endpoints. The API Key must be provided as a Bearer token in the `Authorization` header:
   ```
   Authorization: Bearer API_KEY
   ```
   The API Key is also found in the account's developer settings page at `https://heyzine.com/developers`.

Both credentials are obtained by registering and logging into a Heyzine account. No OAuth flow or scopes are involved.

## Features

### Flipbook Conversion

Convert PDF, DOCX, or PPTX files into interactive flipbooks by providing a URL to the source document. Supports both synchronous (waits for conversion to complete) and asynchronous (returns immediately with a status) modes. Configurable options include title, subtitle, description, page effects (via template), logo, background color, and UI controls (download button, fullscreen, share, navigation buttons). A template flipbook ID can be specified to copy styling from an existing flipbook.

- Source files must be accessible via a direct URL with no redirections.
- Free plan is limited to 5 flipbooks; paid plans offer unlimited conversions.
- Synchronous conversion requires sufficient client timeout for large documents.
- Async conversion returns a state (`started`, `processed`, or `failed`); the flipbook URL returns a not-found page until processing completes.

### Flipbook Management

List all flipbooks in an account, retrieve detailed information about a specific flipbook (including metadata, links, thumbnail, and oEmbed data), and delete flipbooks. Flipbooks can be tagged with comma-separated labels for organization.

### Bookshelf Management

Bookshelves are collections of flipbooks displayed on a shared page. You can list all bookshelves, list flipbooks within a bookshelf, add flipbooks to a bookshelf at a specified position, and remove flipbooks from a bookshelf.

### Social Metadata

Configure the title, description, and thumbnail image used when flipbooks or bookshelves are shared on social media platforms. This can be set independently for individual flipbooks and bookshelves.

### Password Protection & Access Control

Protect flipbooks with password-based access. Supports multiple access modes:

- **Per-user credentials**: Individual username/password pairs for each reader.
- **Single password**: One shared password for all visitors.
- **Google Sign-In**: Restrict access to specific Google accounts.
- **Password only**: Access with just a password (no username).
- **One-time password (OTP)**: Single-use passwords.
- **Email link / Send code**: Email-based one-time access (Premium plans only).

Login screen text for username and password prompts is customizable. Users can be added to and removed from the access list programmatically.

### oEmbed

Retrieve oEmbed data for flipbooks, returning standard oEmbed 1.0 responses with embed HTML, dimensions, and thumbnails. Useful for embedding flipbooks in third-party platforms that support oEmbed discovery.

### jQuery Plugin

A client-side jQuery plugin that automatically converts PDF links on a webpage into flipbook links. Supports modal presentation and customization via DOM attributes.

## Events

### Lead Collection Webhook

Fires when new leads are collected through lead generation forms embedded in flipbooks. The webhook payload includes the lead's form responses (field labels and values), the date of collection, and the associated flipbook's identifier and title. Multiple leads can be batched in a single webhook call.

- Webhook endpoint URLs and call frequency are configured in the account settings at `https://heyzine.com/account/#scripts`.
- Leads are collected from any flipbook form in the account.
