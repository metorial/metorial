# Canva

Read and create designs, manage assets and folders, import public files, export downloadable files, work with comments, and autofill eligible brand templates through Canva’s REST v1 API.

The 25 tools retain all 23 original keys and add exact URL-upload and autofill job polling. Asset, design, folder, comment and template reads expose native IDs. List tools return opaque continuation tokens; reply paging is available through Get Comment Thread.

OAuth uses PKCE and single-use rotating refresh tokens. New connections save their verified Canva user/team and original client binding. Existing access tokens remain usable; older connections without renewal binding require one reconnect for safe refresh. Only scopes used by these tools are requested.

Upload Asset uses Canva’s preview URL-upload API: URL video uploads are limited to 100MB, and public apps using preview APIs cannot pass Canva app review. Import Design creates URL-import jobs. Get Import Job defaults to that family; set `sourceType: "binary"` to inspect a previously created binary-upload import job.

Export Design and Get Export Job return downloadable files while preserving `downloadUrls`. Export pages are one-based. JPG quality and MP4 quality are required. Export URLs expire 24 hours after completion; polling cannot renew them. Request a new export explicitly after expiration. No bearer token is forwarded to the signed file URL.

Brand template access and autofill depend on the user’s plan and template dataset. Autofill checks current dataset keys and types before creating a design. Design links, comment text and signed file URLs are intentional user outcomes. Deleting a folder moves owned contents to Trash and relocates other users’ contents; it does not prove permanent erasure.

No triggers are registered. Native API calls, preview availability, plan entitlements, live file downloads and rotating-token renewal have not been exercised against a provider account in this refresh.
