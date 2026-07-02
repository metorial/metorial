# Slates Specification for Adrapid

## Overview

Adrapid provides tools for scalable and automatic creation of visual marketing assets such as animated banners, images and videos. Users can start from existing templates or from scratch and generate all the sizes and formats needed automatically without manual work.

## Authentication

The Adrapid API uses authentication tokens to authenticate requests. You can view and rotate your token in your account details in the API section.

The API key can be found in your account page → API. The account page can be accessed by clicking on your user name in the top right part of the app.

The token is passed as a Bearer token in the `Authorization` header of HTTP requests:

```
Authorization: Bearer [YOUR_TOKEN]
```

The base URL for all API requests is `https://api.adrapid.com`.

For enterprise/whitelabel integrations, there is a separate Administrative API that uses the same bearer token authentication pattern but operates under a `/v1/api/` path prefix for managing users and access.

## Features

### Banner Creation

The Adrapid REST API can be used to create image, video or HTML5 banners on demand. Banner creation requires specifying a template ID and output format modes (e.g., `png`, `html5`, `mp4`). Banners can be created in different formats through the modes parameter, and multiple modes can be set in one banner creation to get a different file for each mode.

- **Template selection**: There is a list of pre-made templates ready to be used, or custom templates created in the editor can be referenced by their template ID.
- **Size selection**: Banners can be generated in specific sizes or all available sizes for a template using the `sizeIds` parameter.
- **Overrides**: In order to change the template content in the resulting banner, the `overrides` parameter is used. With overrides, texts, images, and CSS properties can be changed. Override items are referenced by their item name as defined in the editor.
- Creation of a banner is an asynchronous operation, so polling to the banner endpoint is needed until its status is "ready".

### Banner Retrieval

Created banners can be retrieved by their ID to check their processing status and download the resulting files. Banners go through states: `exporting` → `ready` (or `failed`).

### Account Information

The API provides an endpoint (`/me`) to retrieve information about the currently authenticated user/account.

### Embedded Editor Widget (Enterprise)

The editor can be embedded in a host app as an iframe, with the editor URL retrieved from the administrative API. The widget supports bidirectional communication via postMessage, allowing the host app to receive events when templates are loaded or items are updated, and to push changes to template items (text, media, CSS).

- Requires a user access URL obtained via the Administrative API.
- Supports passing a specific template ID or showing a template selector.
- Editor customization options are available.

### User Management (Enterprise)

The Administrative API provides endpoints for managing users, including getting access URLs to log users into the Adrapid system. This is part of the enterprise whitelabel offering for embedding Adrapid into third-party platforms.

## Events

The provider does not support events. Banner creation is asynchronous and requires polling the banner endpoint to check completion status; there is no webhook or event subscription mechanism available.
