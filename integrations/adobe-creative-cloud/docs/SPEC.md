# Adobe Creative Cloud integration

The integration provides 19 tools across Creative Cloud Libraries, Photoshop, Firefly, Lightroom, Adobe Stock, User Management, and InDesign. Identity lookup and job polling apply across product areas.

## Authentication

Personal and enterprise user OAuth use Adobe IMS authorization-code and refresh-token flows. Offline access enables refresh tokens. The enterprise method retains its organization ID. Server-to-server connections exchange their saved client ID, client secret, and comma-separated scopes for a new access token when refreshing. Access-token expiry comes from the IMS response.

API access depends on the Adobe Developer Console project, approved scopes, organization permissions, and product entitlements. Get Current User requires personal or enterprise user OAuth.

## Capability map

| API | Tools | Official documentation |
| --- | --- | --- |
| IMS identity | `get_current_user` | [User authentication reference](https://developer.adobe.com/developer-console/docs/guides/authentication/UserAuthentication/ims) |
| Libraries | `list_libraries`, `manage_library`, `list_library_elements`, `get_library`, `get_library_element` | [Libraries reference](https://developer.adobe.com/creative-cloud-libraries/docs/api/) |
| Photoshop | `remove_background`, `edit_psd` | [Photoshop reference](https://developer.adobe.com/firefly-services/docs/photoshop/api/) |
| Firefly | `generate_image`, `generative_fill`, `generative_expand` | [Firefly reference](https://developer.adobe.com/firefly-services/docs/firefly-api/api/) |
| Lightroom | `manage_lightroom_catalog`, `apply_lightroom_edits` | [Content API](https://developer.adobe.com/lightroom/lightroom-api-docs/api/), [image editing guides](https://developer.adobe.com/firefly-services/docs/lightroom/) |
| Adobe Stock | `search_stock`, `license_stock`, `get_stock_asset` | [Stock reference](https://developer.adobe.com/stock/docs/api/) |
| User Management | `manage_users` | [User Management reference](https://adobe-apiplatform.github.io/umapi-documentation/en/RefOverview.html) |
| InDesign | `indesign_data_merge` | [Current InDesign API](https://developer.adobe.com/firefly-services/docs/indesign-apis/) |
| Job polling | `check_job_status` | [Photoshop job status](https://developer.adobe.com/firefly-services/docs/photoshop/guides/get-job-status/) |

## Response and file behavior

Library timestamps remain strings and convert Adobe's millisecond timestamps to ISO timestamps. Library cursors can be offsets or next-page links from earlier invocations; the client extracts the offset and continues to call the fixed Libraries API endpoint.

Stock metadata requests send all requested result columns. Licensing reflects the actual purchase state, including `just_purchased`, and supplies downloadable content using the token query parameter required by Adobe's download endpoint. The ordinary output URL contains no added token.

Firefly generated images are downloadable using the URLs Adobe returns. Those URLs remain in their existing output fields. Download generated results promptly; expired generated content cannot be recovered by silently submitting a new generation.

Asynchronous Photoshop and Lightroom submissions can return only a status URL. A missing status stays absent. Job polling preserves the complete response, including document manifests and errors, and supplies completed Photoshop rendition URLs as downloadable files. It accepts HTTPS Adobe image, Photoshop, and InDesign API hosts and disables redirects on authenticated status requests. Caller-supplied upload destinations are not assumed to be readable downloads.

User Management action failures and partial failures raise a provider error even when the HTTP response is 200.

## Compatibility limits

Existing tool keys, input fields, value types, enum values, optionalness, defaults, auth choices, and legacy request formats remain available.

The existing InDesign `/api/v1/capability/datamerge` request remains unchanged. Adobe's current guide documents `/v3/merge-data` with a different asset/parameter shape; it does not establish support or retirement of this exact legacy route. Its existing submission-status fallback remains a legacy compatibility behavior pending exact endpoint evidence.

The inline Lightroom `presetXmp` request remains unchanged. Adobe's current preset guide describes cloud-hosted preset file references. This integration does not translate inline XMP into an uploaded file.

The Libraries reference currently states a maximum page size of ten libraries, while the existing tool defaults to fifty. That baseline default is retained pending a compatible pagination expansion and provider verification.

Lightroom content browsing remains page-limited and does not expose continuation URLs. Newer Photoshop v2, Firefly asynchronous/video/custom-model APIs, InDesign v3, library-element writes, and Adobe I/O Events are outside this refresh. Provider behavior, entitlement availability, and actual download delivery require authorized live verification.
