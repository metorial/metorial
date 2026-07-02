Now let me fetch the authentication reference page and the export details:# Slates Specification for Draftable

## Overview

Draftable is a document comparison service that identifies differences between two documents, detecting changes in text, formatting, and layout. It can compare Word, PowerPoint, RTF, Excel, PDF, and text documents, including cross-format comparisons (e.g., Word to PDF). The Draftable API lets you integrate document comparison technologies into your app.

## Authentication

Draftable uses **token-based authentication** with two credentials: an **Account ID** and an **Auth Token**.

- Credentials can be obtained from `https://api.draftable.com/account/credentials`.
- Requests are authenticated by passing the auth token in the `Authorization` header using the format: `Authorization: Token {access_token}`.
- The API base URL for the cloud-hosted service is `https://api.draftable.com/v1`.
- For self-hosted or regional deployments, a custom base URL can be provided (e.g., `https://draftable.example.com/api/v1`).

Both the Account ID and Auth Token are required for all API operations. When creating comparisons, the `public` flag determines visibility: if `false` or unspecified, authentication is required to view the comparison; if `true`, the comparison can be accessed by anyone with knowledge of the URL.

For private comparisons, **signed viewer URLs** can be generated client-side using the Account ID and Auth Token. The expiry time defaults to 30 minutes if not specified, but a custom expiry can be set.

## Features

### Document Comparison

Create comparisons between two documents (referred to as "left" and "right" sides). Documents can be provided via a publicly accessible URL or uploaded directly as a file. You can compare different file types against each other, such as Word docs to PDFs, PowerPoints to Excel files, or any other combination. The comparison analyses text, formatting, and layout to detect changes like insertions, deletions, and formatting adjustments.

- **Parameters**: Each side requires a `file_type` (e.g., `pdf`, `rtf`, `docx`, `pptx`, `xlsx`) and optionally a `display_name`. Comparisons can include a custom `identifier`, a `public` visibility flag, and an optional `expires` timestamp.
- If an expiry is specified, the provided time must be UTC and in the future. If unspecified, the comparison will never expire but may be explicitly deleted.

### Comparison Viewer

Access an interactive viewer for any comparison, supporting side-by-side and single-page (redline) views. The viewer shows changes to text styles like font, font size, bold, and italics. The viewer can be embedded in an application via an iframe using a signed or public viewer URL.

- **Parameters**: Signed viewer URLs accept a custom expiry duration and a `wait` flag that causes the viewer to wait if comparison processing has not yet completed.

### Comparison Export

Export comparisons to PDF format for easy sharing. Four export kinds are supported: `left` (left document with deletion highlights), `right` (right document with insertion highlights), `combined` (both documents side by side), and `single_page` (comparison in single-page mode).

- **Parameters**: Export kind and an optional `include_cover_page` flag (only applies to the `combined` export kind).
- Exports are asynchronous; after requesting an export, you must poll for its completion status to obtain the download URL.

### Change Details

Draftable provides a change-details endpoint that allows users to retrieve comparison results as a structured JSON response. This provides a programmatic summary of all detected changes between the two documents, useful for integrating comparison results into workflows without using the visual viewer.

### Comparison Management

Retrieve all comparisons associated with your account, get a specific comparison by identifier, or delete comparisons. Retrieving all comparisons returns them ordered from newest to oldest.

## Events

The provider does not support events. Draftable's API does not offer webhooks or event subscription mechanisms. Export completion must be determined by polling.
