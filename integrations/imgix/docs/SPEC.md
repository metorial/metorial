# imgix API coverage

The integration uses the current Bearer JSON:API Management API at `https://api.imgix.com/api/v1`. Fourteen public tools retain all twelve original keys. It does not upload origin objects or expose administrative user/key operations. Legacy triggers are absent.

| Tools | API behavior |
| --- | --- |
| list_sources / get_source | Native zero-based source pages and exact source reads; safe configuration and actual account relationship when provided. |
| create_source / update_source | POST 201 and PATCH 200 with JSON:API type/id. Deployment, cache and security belong inside the deployment object. Full replacement requires explicit complete credentials/settings. Azure create/replacement is refused before sending its SAS credential; use the dashboard. Azure reads and direct name/enabled changes remain supported. No source deletion endpoint is claimed. |
| list_assets / get_asset / update_asset | Source-scoped paths; native opaque cursor and 10000-or-more count cap; exact asset identity; metadata list/object replacement. |
| add_asset | POST empty object, HTTP 202: origin indexing is queued. A later GET establishes availability. |
| refresh_asset | POST empty object, HTTP 200 asset receipt: origin re-fetch, reprocess on ETag change, cache purge; no erase guarantee. |
| purge_cache | POST JSON:API purge, HTTP 200 exact purge ID. Duplicate requests can return 409; no automatic retries. |
| get_reports | Native pages or exact report, including credit reports; optional completed report parts. Reports retained 90 days; no invented renewal contract. |
| build_render_url / generate_signed_url | Local HTTPS URL construction, UTF-8 path/query encoding, base64url parameters ending in 64, MD5 lowercase hexadecimal signatures with s last. Source-based signing uses the current internal token. |
| download_asset | Read an existing asset and active deployed source, validate assigned domain, and provide a downloadable rendering URL. Web Proxy arbitrary-origin delivery is excluded. Explicit signed expiry supports current-source renewal. |

Rendering URLs can cause billed rendering/delivery when used. Sources, metadata history, origin data and cached files can remain after disabling, refresh or purge. Provider permissions, plans, deployment time and metadata availability remain provider-dependent.

Official references: [overview](https://docs.imgix.com/en-US/apis/management/overview), [general usage](https://docs.imgix.com/en-US/apis/management/general-usage), [sources](https://docs.imgix.com/en-US/apis/management/sources), [assets](https://docs.imgix.com/en-US/apis/management/assets), [purges](https://docs.imgix.com/en-US/apis/management/purges), [reports](https://docs.imgix.com/en-US/apis/management/reports), [secure assets](https://docs.imgix.com/en-US/getting-started/setup/securing-assets), [URL blueprint](https://github.com/imgix/imgix-blueprint).
