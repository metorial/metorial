Now let me get more details on the webhook events and the OpenAPI spec for features.Now let me check the webhooks documentation page specifically:I can see the API docs have a Webhooks section in the navigation. Let me try to access the webhooks page directly:Now I have enough information to compile the specification. Let me summarize what I've gathered:

# Slates Specification for Thanks.io

## Overview

Thanks.io is a cloud-based direct mail automation platform that enables sending personalized handwritten postcards, letters, notecards, and gift cards at scale. It provides an API for programmatically sending physical mail, managing recipients and mailing lists, and tracking delivery and QR code engagement.

## Authentication

Thanks.io supports two authentication methods:

### 1. Personal Access Token (Bearer Token)

The simplest authentication method. Generate a Personal Access Token from the [API Settings page](https://dashboard.thanks.io/profile/api) in the thanks.io dashboard under "Personal Access Tokens (API Key)."

Include the token in the `Authorization` header of every request:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 2. OAuth 2.0

For applications acting on behalf of thanks.io users. Requires registering an OAuth client at [https://dashboard.thanks.io/developer](https://dashboard.thanks.io/developer) to obtain a client ID and client secret.

**Authorization flow:**

1. Redirect user to: `https://dashboard.thanks.io/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI`
2. Exchange the authorization code for tokens at: `POST https://dashboard.thanks.io/oauth/token` with `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, and `code`.
3. Refresh expired tokens at the same token endpoint with `grant_type=refresh_token` and the `refresh_token`.

The resulting access token is used as a Bearer Token in the `Authorization` header, same as with Personal Access Tokens. There are no specific OAuth scopes documented.

**Base API URL:** `https://api.thanks.io/api/v2`

## Features

### Send Direct Mail

Send various types of physical mail pieces to recipients, including postcards (4x6, 6x9, 6x11), notecards (folded 4.25x5.5 in envelope), windowed letters, windowless letters, magnacards, and gift cards. Each mail type supports providing a front image (via URL or image template), a handwritten message (inline or via message template), custom handwriting styles and colors, QR codes, custom return addresses, and custom background images. A preview mode is available for all mail types to generate visual previews without placing an actual order. Recipients can be specified inline, via mailing lists, or via radius search.

- Messages support personalization tags like `%FIRST_NAME%`, `%COMPANY%`, etc.
- Mail can be sent as First Class or Standard Mail.
- Gift cards require specifying a brand and amount from the available gift card catalog.
- Letters support attaching additional PDF pages or sending a PDF-only mailer.

### Recipient Management

Create, retrieve, update, and delete recipients. Recipients are stored within mailing lists and include fields for name, company, address, email, phone, date of birth, and up to four custom fields. Recipients can be created individually or in bulk. If no valid address is provided but an email is, thanks.io can attempt to look up the mailing address from the email for a fee. Recipients can also be deleted by address or email rather than by ID. Only US and Canadian addresses are accepted.

### Mailing List Management

Create, list, retrieve, and delete mailing lists. Each mailing list can be associated with a sub-account and optionally have a default QR code URL. Lists can be of various types (manual, CSV, map, radius, etc.). You can retrieve all recipients in a specific mailing list, with optional filtering by last-updated date.

### Radius Search / Lead Generation

Search for recipients within a geographic radius of a given address. Results are added to a new or existing mailing list. Supports filtering by record type (e.g., likely to move, new homeowner, absentee owner, renters, high net worth, businesses, etc.), and optionally appending phone and email data to each record. Radius search can also be used directly when sending mail, without creating a separate mailing list first.

### Order Management

List recent orders with details such as type, status, cost, and recipient count. Track delivery status of an order, including statistics for delivered, in-transit, printed, returned, and failed items. Cancel orders that are still in "Reviewing" status for a full refund.

### Templates

Retrieve saved image templates and message templates. Image templates are used for the front/exterior of mail pieces. Message templates store handwritten message content, handwriting style, font settings, QR code URLs, and gift card configuration. Templates are managed through the thanks.io dashboard and referenced by ID when sending mail.

### Handwriting Styles

List all available handwriting styles, which include Realistic, Bold, AI, and International (Arabic, Chinese, Cyrillic, Hebrew, Japanese, Korean, Vietnamese) types. Styles are referenced by ID when sending mail. AI styles support configurable realism levels and font sizes.

### Gift Card Catalog

Retrieve all available gift card brands, grouped by category (Featured, Food, Entertainment, Gifts, Travel, Big Box). Each brand includes its code, display image, and available denomination amounts. Brands include major retailers such as Amazon, Starbucks, Target, Home Depot, and many others.

### Sub-Account Management

Create, list, retrieve, update, and delete sub-accounts for managing multiple clients or business units. Sub-accounts have their own return address, branding fields, and can be associated with mailing lists and orders. Deleting a sub-account moves its orders and mailing lists to the main account.

### Dynamic Image Builder

Build personalized images for the front of postcards or notecards with dynamic data fields, custom headers, sub-headers, logos, background images (including Google Street View or Map View), QR codes, and overlays. Supports dynamic tags that are replaced with recipient-specific data (e.g., `~FULL_NAME~`, `~ADDRESS~`, `~CUSTOM1~`).

## Events

Thanks.io supports webhooks for receiving real-time notifications about events. The API includes endpoints for managing webhook subscriptions (listed under the Webhooks section of the API). Based on available documentation, the following event categories are supported:

### Recipient Added

Triggered when a recipient is added to a mailing list via the API, Zapier, landing pages, retargeting, or card builder. Can be filtered by specific mailing list.

### Mail Delivered

Triggered when a postcard, letter, notecard, or gift card is delivered to a recipient. Can be filtered by specific mailing list.

### QR Code Scanned / Gift Card Redeemed

Triggered when a QR code on a postcard, letter, or notecard is scanned by the recipient. Also triggers when a gift card is redeemed. Can be filtered by specific mailing list.
