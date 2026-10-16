# Adrapid Integration

## Overview

Adrapid provides tools for scalable and automatic creation of visual marketing assets such as animated banners, images and videos. Users can start from existing templates or from scratch and generate all the sizes and formats needed automatically without manual work.

## Authentication

The Adrapid API uses authentication tokens to authenticate requests. You can view and rotate your token in your account details in the API section.

The API key can be found in your account page → API. The account page can be accessed by clicking on your user name in the top right part of the app.

The token is passed as a Bearer token in the `Authorization` header of HTTP requests:

```
Authorization: Bearer [YOUR_TOKEN]
```

The documented user API base URL is `https://api.adrapid.com/v1/api`.

For enterprise/whitelabel integrations, there is a separate Administrative API that uses the same bearer token authentication pattern but operates under a `/v1/api/` path prefix for managing users and access.

## Features

### Banner Creation

The Adrapid REST API can be used to create image, video or HTML5 banners on demand. Banner creation requires specifying a template ID and output format modes (e.g., `png`, `html5`, `mp4`). Banners can be created in different formats through the modes parameter, and multiple modes can be set in one banner creation to get a different file for each mode.

- **Template selection**: There is a list of pre-made templates ready to be used, or custom templates created in the editor can be referenced by their template ID.
- **Size selection**: Banners can be generated in specific sizes or all available sizes for a template using the `sizeIds` parameter.
- **Overrides**: In order to change the template content in the resulting banner, the `overrides` parameter is used. With overrides, texts, images, and CSS properties can be changed. Override items are referenced by their item name as defined in the editor.
- Creation of a banner is an asynchronous operation, so polling to the banner endpoint is needed until its status is "ready".

### Banner Retrieval

Created banners can be retrieved by their ID to check their processing status and download the resulting files. Banners normally progress from `exporting` to `ready` or `failed`; the response schema also documents `uploaded`. While exporting, the provider can return `files: null`; the tool exposes an empty files collection and preserves the complete response in `raw`. Completed files become downloadable, and their original URLs and component-file metadata are retained.

The user API also exposes a paginated banner list with `offset`, `limit` (at least 10), `search`, and `status` filters. List Banners enables discovery of banner IDs for subsequent retrieval. Its count comes from the provider and is omitted if not returned.

Creation supports optional custom `sizes`, `clicktag`, `editable`, and `excludeBaseSize` parameters. Image modes use booleans, for example `{"png": true}`; video and GIF accept documented options. A returned `templateId` identifies an editable template, when one exists. File identifiers, file status, and direct URLs are exposed only when returned by the provider.

### Account Information

The API provides an endpoint (`/v1/api/me`) to retrieve information about the currently authenticated user/account. The documented response includes a nested `user` object; the integration also accepts the previously supported flat account response. Existing bearer-token authentication and empty connection configuration remain unchanged.

### Embedded Editor Widget (Enterprise)

The editor can be embedded in a host app as an iframe, with the editor URL retrieved from the administrative API. The widget supports bidirectional communication via postMessage, allowing the host app to receive events when templates are loaded or items are updated, and to push changes to template items (text, media, CSS).

- Requires a user access URL obtained via the Administrative API.
- Supports passing a specific template ID or showing a template selector.
- Editor customization options are available.

### User Management (Enterprise)

The Administrative API provides endpoints for managing users, including getting access URLs to log users into the Adrapid system. This is part of the enterprise whitelabel offering for embedding Adrapid into third-party platforms.

## Events

No server webhook or event subscription mechanism is documented in the user API. Banner creation is asynchronous and requires polling the banner endpoint to check completion status. Embedded editor postMessage events belong to the browser widget and are not server triggers.

## API sources

- [API overview and bearer-token authentication](https://docs.adrapid.com/api/overview)
- [User API Swagger](https://user-api-docs.adrapid.com/)
- [User API OpenAPI entrypoint](https://api.adrapid.com/spec/v1/client-api.yaml)
- [Shared request and response schemas](https://api.adrapid.com/spec/v1/api.yaml)
- [Embedded editor access](https://docs.adrapid.com/enterprise/whitelabel/widget)

The older overview illustrates unversioned `/banners` routes, while its linked Swagger publishes the current user API under `/v1/api`. The integration uses the published versioned endpoints with the existing bearer token, input fields, and public tool keys. Enterprise resource administration is outside the ordinary user workflow.
